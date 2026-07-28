import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

/**
 * Permanently removes catalog rows whose affiliate link is a boolean literal
 * ("TRUE"/"FALSE") instead of a URL.
 *
 * These were created by a Sheet-sync column misalignment: the sync read the
 * Active column into affiliateUrl and, because it also read DB_ID from an
 * empty column, created a fresh duplicate row on every run instead of
 * updating. They can never produce a working buy link, they duplicate rows
 * that already exist in the Sheet, and they double the admin product list.
 *
 * Safe to delete: the Google Sheet is the source of truth, so anything real
 * is recreated by a sync. Deliberately does NOT touch rows that were hidden
 * for legitimate reasons (e.g. a dead link on a real partner).
 *
 * Report-only by default; pass --apply to delete.
 */
async function main() {
  const apply = process.argv.includes("--apply");

  const corrupted = await prisma.product.findMany({
    where: { affiliateUrl: { in: ["TRUE", "FALSE"] } },
    select: { id: true, nameEn: true, category: true, active: true },
  });

  const active = corrupted.filter((p) => p.active);
  console.log(`Rows with a boolean affiliate link: ${corrupted.length}`);
  console.log(`  of those currently ACTIVE (should be 0): ${active.length}`);
  active.forEach((p) => console.log(`     !! ${p.nameEn}`));

  const before = await prisma.product.count();
  const liveBefore = await prisma.product.count({ where: { active: true } });

  if (!apply) {
    console.log(`\nDry run. Would delete ${corrupted.length} rows, leaving ${before - corrupted.length} total.`);
    await prisma.$disconnect();
    return;
  }

  if (active.length > 0) {
    throw new Error("Refusing to delete: some corrupted rows are still active. Investigate first.");
  }

  const res = await prisma.product.deleteMany({
    where: { affiliateUrl: { in: ["TRUE", "FALSE"] }, active: false },
  });

  const after = await prisma.product.count();
  const liveAfter = await prisma.product.count({ where: { active: true } });
  const hidden = await prisma.product.count({ where: { active: false } });

  console.log(`\nDeleted ${res.count} corrupted rows.`);
  console.log(`Catalog: ${before} -> ${after} total | live ${liveBefore} -> ${liveAfter} | hidden now ${hidden}`);

  const remainingHidden = await prisma.product.findMany({
    where: { active: false },
    select: { nameEn: true, affiliateUrl: true },
  });
  console.log("Remaining hidden rows (kept on purpose):");
  remainingHidden.forEach((p) => console.log(`   ${p.nameEn} -> ${p.affiliateUrl}`));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
