import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import {
  getSheetsClient,
  getSheetId,
  PRODUCT_SHEET_TAB,
  PRODUCT_SHEET_RANGE,
  PRODUCT_SHEET_HEADER_RANGE,
} from "../src/lib/sheets/client";
import { buildColumnMap } from "../src/lib/sheets/sync";

function columnLetter(index: number): string {
  let n = index;
  let letters = "";
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

/**
 * Writes the discovered images into the Sheet's Image_URL column.
 *
 * Essential, not optional: the Sheet is the source of truth, so a sync
 * overwrites any image that exists only in the database. Without this step
 * the backfill silently reverts the next time anyone presses Sync Now. It
 * also puts the images in front of the client, where they can be replaced
 * with something better.
 */
async function writeImagesToSheet(found: { id: string; image: string }[]): Promise<number> {
  if (found.length === 0) return 0;
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const [head, body] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: PRODUCT_SHEET_HEADER_RANGE }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: PRODUCT_SHEET_RANGE }),
  ]);
  const map = buildColumnMap((head.data.values?.[0] ?? []) as string[]);
  if (map.imageUrl === undefined || map.dbId === undefined) {
    console.warn("Sheet has no Image_URL or DB_ID column — cannot persist images.");
    return 0;
  }

  const rows = (body.data.values ?? []) as string[][];
  const rowByDbId = new Map<string, number>();
  rows.forEach((row, i) => {
    const dbId = String(row[map.dbId!] ?? "").trim();
    if (dbId) rowByDbId.set(dbId, i + 2); // range starts at row 2
  });

  const letter = columnLetter(map.imageUrl);
  const data = found
    .filter((f) => rowByDbId.has(f.id))
    .map((f) => ({ range: `${PRODUCT_SHEET_TAB}!${letter}${rowByDbId.get(f.id)}`, values: [[f.image]] }));

  if (data.length === 0) return 0;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });
  return data.length;
}

/**
 * Fills in a real store image for products that have none, by reading the
 * store page's own og:image / twitter:image preview tag.
 *
 * Why this runs as a batch job and not per chat request: fetching a remote
 * page takes seconds and often fails, which would make the chat slow and
 * unreliable. Doing it once and storing the result keeps the chat instant.
 *
 * What it can and cannot do (measured against the real catalog, not assumed):
 * roughly half of partner stores expose a usable preview image. The rest
 * either block automated requests or ship no og:image tag. What comes back is
 * the store's own branding image, NOT a photo of a specific product — that
 * distinction matters, because no amount of scraping turns a store-level
 * affiliate link into product-level imagery.
 *
 * Report-only by default; pass --apply to write.
 */

const TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;

async function fetchPreviewImage(url: string): Promise<{ image?: string; note: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!res.ok) return { note: `HTTP ${res.status}` };

    const html = (await res.text()).slice(0, 200_000);
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    // Meta tag contents are HTML-escaped, so query separators arrive as
    // "&#x26;" / "&amp;". Storing them raw yields a URL that never loads.
    const decodeEntities = (text: string) =>
      text
        .replace(/&(?:amp|#38|#x26);/gi, "&")
        .replace(/&(?:quot|#34|#x22);/gi, '"')
        .replace(/&(?:apos|#39|#x27);/gi, "'")
        .replace(/&(?:lt|#60|#x3c);/gi, "<")
        .replace(/&(?:gt|#62|#x3e);/gi, ">");

    const raw = match?.[1] ? decodeEntities(match[1]).trim() : "";
    if (!raw) return { note: "no og:image tag" };

    // Resolve protocol-relative and root-relative values against the final URL.
    let resolved: string;
    try {
      resolved = new URL(raw, res.url || url).toString();
    } catch {
      return { note: "unparseable image url" };
    }
    if (!/^https?:\/\//i.test(resolved)) return { note: "non-http image url" };
    return { image: resolved, note: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { note: /abort/i.test(message) ? "timed out / blocked" : `fetch failed` };
  } finally {
    clearTimeout(timer);
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const targets = await prisma.product.findMany({
    where: {
      active: true,
      OR: [{ imageUrl: null }, { imageUrl: "" }],
      affiliateUrl: { startsWith: "http" },
    },
    select: { id: true, nameEn: true, affiliateUrl: true },
  });

  console.log(`Stores with no image and a usable link: ${targets.length}`);

  const results = await runWithConcurrency(targets, CONCURRENCY, async (p) => {
    const res = await fetchPreviewImage(p.affiliateUrl!);
    return { ...p, ...res };
  });

  const found = results.filter((r) => r.image);
  const failed = results.filter((r) => !r.image);

  console.log(`\n=== FOUND an image: ${found.length} ===`);
  found.forEach((r) => console.log(`  ${r.nameEn.padEnd(26)} ${r.image!.slice(0, 70)}`));

  console.log(`\n=== no image available: ${failed.length} (these keep the brand logo) ===`);
  failed.forEach((r) => console.log(`  ${r.nameEn.padEnd(26)} ${r.note}`));

  if (!apply) {
    console.log(`\nDry run — nothing written. Re-run with --apply to save these ${found.length} images.`);
    await prisma.$disconnect();
    return;
  }

  for (const r of found) {
    await prisma.product.update({ where: { id: r.id }, data: { imageUrl: r.image } });
  }

  const written = await writeImagesToSheet(found.map((f) => ({ id: f.id, image: f.image! })));

  const withImage = await prisma.product.count({
    where: { active: true, NOT: [{ imageUrl: null }, { imageUrl: "" }] },
  });
  const active = await prisma.product.count({ where: { active: true } });
  console.log(`\nSaved ${found.length} images to the database.`);
  console.log(`Wrote ${written} of them into the Sheet's Image_URL column, so a sync cannot wipe them.`);
  console.log(`Active products with an image: ${withImage}/${active}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
