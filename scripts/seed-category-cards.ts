import "dotenv/config";
import { ensureDefaultCategoryCards, listActiveCategoryCards } from "../src/lib/category-cards/store";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  await ensureDefaultCategoryCards();
  const cards = await listActiveCategoryCards();
  console.log(`Category cards ready: ${cards.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
