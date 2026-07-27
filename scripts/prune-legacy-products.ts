import "dotenv/config";
import { getSheetsClient, getSheetId, PRODUCT_SHEET_RANGE, PRODUCT_SHEET_HEADER_RANGE } from "../src/lib/sheets/client";
import { buildColumnMap } from "../src/lib/sheets/sync";
import { prisma } from "../src/lib/db/prisma";

/**
 * Deactivates legacy product rows that the Google Sheet no longer controls.
 *
 * Background: the catalog accumulated rows from several one-off seed scripts
 * before the Sheet became the source of truth. Those legacy rows carry no
 * subcategory and no keyword tags, but they DO carry a stock photo — which,
 * under the chat's relevance scoring, let them outrank the properly tagged
 * Sheet row for the same store and surface for unrelated queries.
 *
 * Only rows that (a) are absent from the Sheet AND (b) have a Sheet-backed
 * row with the same store name are deactivated, so every deactivation has a
 * better-quality replacement already live. Rows with no Sheet twin are
 * reported but left alone, since removing them would lose coverage.
 *
 * Report-only by default; pass --apply to write. Deactivates (active=false)
 * rather than deleting, so it is reversible.
 */

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const apply = process.argv.includes("--apply");

  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const [h, b] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: PRODUCT_SHEET_HEADER_RANGE }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: PRODUCT_SHEET_RANGE }),
  ]);
  const header = (h.data.values?.[0] ?? []) as string[];
  const body = (b.data.values ?? []) as string[][];
  const map = buildColumnMap(header);

  if (map.dbId === undefined) {
    throw new Error("Sheet has no DB_ID column — cannot tell Sheet-backed rows from legacy rows. Aborting.");
  }
  const sheetIds = new Set(body.map((r) => String(r[map.dbId!] ?? "").trim()).filter(Boolean));

  const all = await prisma.product.findMany({
    select: { id: true, nameEn: true, category: true, subcategory: true, tags: true, active: true },
  });

  const sheetBacked = all.filter((p) => sheetIds.has(p.id));
  const legacyActive = all.filter((p) => !sheetIds.has(p.id) && p.active);

  const sheetNames = new Set(sheetBacked.map((p) => normalizeName(p.nameEn)));
  const redundant = legacyActive.filter((p) => sheetNames.has(normalizeName(p.nameEn)));
  const uniqueLegacy = legacyActive.filter((p) => !sheetNames.has(normalizeName(p.nameEn)));

  // A legacy row whose Sheet twin is itself deactivated still needs removing:
  // the twin was almost certainly switched off for a reason (e.g. a dead
  // affiliate link), and leaving the legacy copy live keeps serving exactly
  // the link that was meant to be retired.
  const activeSheetNames = new Set(sheetBacked.filter((p) => p.active).map((p) => normalizeName(p.nameEn)));
  const withLiveTwin = redundant.filter((p) => activeSheetNames.has(normalizeName(p.nameEn)));
  const withRetiredTwin = redundant.filter((p) => !activeSheetNames.has(normalizeName(p.nameEn)));

  console.log(`Sheet-backed products      : ${sheetBacked.length}`);
  console.log(`Legacy active products     : ${legacyActive.length}`);
  console.log(`  redundant (Sheet has same store) : ${redundant.length}  <-- will deactivate`);
  console.log(`     - Sheet twin is live            : ${withLiveTwin.length}`);
  console.log(`     - Sheet twin already retired    : ${withRetiredTwin.length} (legacy copy still serving a retired link)`);
  withRetiredTwin.forEach((p) => console.log(`         ${p.nameEn}`));
  console.log(`  unique (no Sheet twin)           : ${uniqueLegacy.length}  <-- left active`);

  console.log("\n=== UNIQUE legacy rows kept active (review these with the client) ===");
  if (uniqueLegacy.length === 0) console.log("  (none)");
  uniqueLegacy
    .sort((a, b) => a.category.localeCompare(b.category) || a.nameEn.localeCompare(b.nameEn))
    .forEach((p) => console.log(`  [${p.category}] ${p.nameEn} | sub=${p.subcategory ?? "-"} | tags=${p.tags ?? "-"}`));

  if (!apply) {
    console.log(`\nDry run — nothing changed. Re-run with --apply to deactivate the ${redundant.length} redundant legacy rows.`);
    await prisma.$disconnect();
    return;
  }

  if (redundant.length > 0) {
    const res = await prisma.product.updateMany({
      where: { id: { in: redundant.map((p) => p.id) } },
      data: { active: false },
    });
    console.log(`\nDeactivated ${res.count} redundant legacy products.`);
  }

  const remaining = await prisma.product.count({ where: { active: true } });
  console.log(`Active products now: ${remaining}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
