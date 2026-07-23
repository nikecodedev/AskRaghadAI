import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const total = await prisma.product.count();
  const withUrl = await prisma.product.count({
    where: { affiliateUrl: { not: null } },
  });
  const withCode = await prisma.product.count({
    where: { discountCode: { not: null } },
  });
  const sample = await prisma.product.findMany({
    take: 8,
    orderBy: { updatedAt: "desc" },
    select: {
      nameEn: true,
      category: true,
      affiliateUrl: true,
      discountCode: true,
      active: true,
    },
  });
  console.log(JSON.stringify({ total, withUrl, withCode, sample }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
