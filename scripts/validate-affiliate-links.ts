import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

/**
 * Checks every active product's affiliateUrl for dead/broken destinations.
 *
 * Report-only by default — pass --apply to actually deactivate confirmed-dead
 * links. Kept conservative on purpose: many affiliate tracking redirects
 * (go.urtrackinglink.com, etc.) block non-browser requests and return
 * errors/403s to an automated checker even though the link works fine for a
 * real user clicking from the site, so a false positive here would silently
 * remove a working revenue link. Only DNS failures, connection refusals, and
 * explicit 404/410/5xx are auto-flagged as "dead". Everything else (403,
 * timeout, redirect loops, suspected parking pages) is reported as
 * "needs manual review" and never auto-deactivated.
 */

const TIMEOUT_MS = 10_000;
const CONCURRENCY = 8;

// Best-effort text signals for a domain that resolves but shows a parking /
// "not connected" page instead of the real site (e.g. myscarf.com's Wix
// "domain not connected" error, which returns HTTP 200).
const PARKING_PAGE_PATTERNS = [
  /domain (is )?not connected/i,
  /this domain (is|isn't|is not) (currently )?connected/i,
  /website (is )?(temporarily )?unavailable/i,
  /this site can(’|')?t be reached/i,
  /domain (may be )?for sale/i,
  /buy this domain/i,
  /account (has been )?suspended/i,
  /this account has been suspended/i,
  /default web (site|page)/i,
];

type CheckResult = {
  id: string;
  nameEn: string;
  category: string;
  affiliateUrl: string;
  status: "ok" | "dead" | "review";
  reason: string;
};

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

async function checkUrl(url: string): Promise<{ status: "ok" | "dead" | "review"; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      if (
        lower.includes("enotfound") ||
        lower.includes("econnrefused") ||
        lower.includes("dns") ||
        lower.includes("getaddrinfo")
      ) {
        return { status: "dead", reason: `DNS/connection failure: ${message}` };
      }
      if (lower.includes("abort") || lower.includes("timeout")) {
        return { status: "review", reason: "Timed out (may just be blocking automated requests)" };
      }
      return { status: "review", reason: `Fetch error: ${message}` };
    }

    if (res.status === 404 || res.status === 410) {
      return { status: "dead", reason: `HTTP ${res.status}` };
    }
    if (res.status >= 500) {
      return { status: "dead", reason: `HTTP ${res.status}` };
    }
    if (res.status === 403 || res.status === 429) {
      return { status: "review", reason: `HTTP ${res.status} (likely bot-blocking, not necessarily broken)` };
    }

    if (res.ok) {
      const bodySample = (await res.text().catch(() => "")).slice(0, 5000);
      const parkingMatch = PARKING_PAGE_PATTERNS.find((p) => p.test(bodySample));
      if (parkingMatch) {
        return { status: "review", reason: `Possible parking/error page (matched: ${parkingMatch})` };
      }
      return { status: "ok", reason: `HTTP ${res.status}` };
    }

    return { status: "review", reason: `HTTP ${res.status}` };
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

  const products = await prisma.product.findMany({
    where: { active: true, affiliateUrl: { not: null } },
    select: { id: true, nameEn: true, category: true, affiliateUrl: true },
  });

  const candidates = products.filter((p) => p.affiliateUrl && isLikelyUrl(p.affiliateUrl));
  console.log(`Checking ${candidates.length} active affiliate links (of ${products.length} active rows with affiliateUrl set; the rest hold non-URL values like discount codes)...`);

  const checked: CheckResult[] = await runWithConcurrency(candidates, CONCURRENCY, async (p) => {
    const { status, reason } = await checkUrl(p.affiliateUrl!);
    return { id: p.id, nameEn: p.nameEn, category: p.category, affiliateUrl: p.affiliateUrl!, status, reason };
  });

  const dead = checked.filter((c) => c.status === "dead");
  const review = checked.filter((c) => c.status === "review");
  const ok = checked.filter((c) => c.status === "ok");

  console.log(`\n=== OK: ${ok.length} ===`);

  console.log(`\n=== CONFIRMED DEAD: ${dead.length} ===`);
  dead.forEach((c) => console.log(`- [${c.category}] ${c.nameEn} (${c.id}) — ${c.affiliateUrl} — ${c.reason}`));

  console.log(`\n=== NEEDS MANUAL REVIEW: ${review.length} ===`);
  review.forEach((c) => console.log(`- [${c.category}] ${c.nameEn} (${c.id}) — ${c.affiliateUrl} — ${c.reason}`));

  if (apply && dead.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: dead.map((c) => c.id) } },
      data: { active: false },
    });
    console.log(`\nDeactivated ${dead.length} confirmed-dead products.`);
  } else if (dead.length > 0) {
    console.log(`\nDry run — nothing changed. Re-run with --apply to deactivate the ${dead.length} confirmed-dead products above.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
