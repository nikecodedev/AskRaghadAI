import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { setProductsActive } from "../src/lib/sheets/sync";

/**
 * Deactivates affiliate rows whose offers were individually confirmed dead.
 *
 * Each id below returned HTTP 404 from the affiliate network while control
 * offers on the same network, using the same aff_id, returned 200 — so the
 * offers have genuinely ended rather than the network blocking an automated
 * checker. Targeted by id instead of re-running validate-affiliate-links with
 * --apply, because a transient 5xx during a bulk re-check would silently take
 * a working revenue link offline.
 *
 * Goes through setProductsActive so the sheet's Active column is updated too:
 * a blank Active cell parses as active, so a database-only change would be
 * reverted by the next pull. Reversible — flip the same ids back on, or set
 * Active to TRUE in the sheet, once fresh links are in place.
 */

const DEAD_IDS = [
  "cmrxoupf1001xuilggtlrvjde", // Platinumlist       (travel)
  "cmrxoupsr001yuilg5x8mpyn9", // Yas Island         (travel)
  "cmrxouqyl0021uilgpsg3s0la", // Ferrari World      (travel)
  "cmrxounsk001tuilgf0yjogto", // Expedia KSA        (travel)
  "cmrxouo90001uuilglurjj0tn", // Expedia UAE        (travel)
  "cmrxoubhq000yuilg25h0dj6e", // Bath & Body Works  (skincare)
  "cmrtvycgc000nvvw00dmuxscp", // Bath & Body Works  (beauty)
];

async function main() {
  const apply = process.argv.includes("--apply");

  const rows = await prisma.product.findMany({
    where: { id: { in: DEAD_IDS } },
    select: { id: true, nameEn: true, category: true, active: true },
  });

  const missing = DEAD_IDS.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) {
    console.log(`WARNING: ${missing.length} id(s) not found: ${missing.join(", ")}\n`);
  }

  console.log(`Matched ${rows.length}/${DEAD_IDS.length} rows:`);
  for (const r of rows) {
    console.log(`  [${r.category}] ${r.nameEn} — active=${r.active}`);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to deactivate.");
    return;
  }

  const result = await setProductsActive(DEAD_IDS, false);
  console.log(`\nDeactivated ${result.updated} rows in the database.`);
  console.log(`Wrote FALSE into ${result.sheetRowsWritten} sheet row(s).`);
  if (result.unlinked.length > 0) {
    console.log(`Not linked to a sheet row (database only): ${result.unlinked.join(", ")}`);
  }

  const active = await prisma.product.count({ where: { active: true } });
  const travel = await prisma.product.count({ where: { active: true, category: "travel" } });
  console.log(`Active products remaining: ${active} (travel: ${travel})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
