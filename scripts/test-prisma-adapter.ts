import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const users = await prisma.user.count();
  const products = await prisma.product.count();
  const cards = await prisma.categoryCard.count();
  console.log(JSON.stringify({ users, products, cards, ok: true }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
