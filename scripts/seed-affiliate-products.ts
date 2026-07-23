import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { AFFILIATE_PRODUCTS } from "./affiliate-products";

const prisma = new PrismaClient();

async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("Can't reach database server") || i === attempts - 1) throw error;
      console.log(`DB not ready (Neon waking up?) — retry ${i + 2}/${attempts} in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw lastError;
}

async function main() {
  await withDbRetry(async () => {
  // Remove old sample / test products
  const removed = await prisma.product.deleteMany({
    where: {
      OR: [
        { affiliateUrl: { contains: "example.com" } },
        { nameEn: "testen" },
      ],
    },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} sample/test product(s).`);
  }

  let created = 0;
  let updated = 0;

  for (const p of AFFILIATE_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { nameEn: p.nameEn, category: p.category },
    });

    const data = {
      category: p.category,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      descriptionEn: p.descriptionEn,
      descriptionAr: p.descriptionAr,
      affiliateUrl: p.affiliateUrl,
      discountCode: p.discountCode,
      active: true,
      currency: "SAR",
    };

    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data });
      created++;
    }
  }

  const total = await prisma.product.count({ where: { active: true } });
  console.log(`Affiliate seed done: ${created} created, ${updated} updated.`);
  console.log(`Active products in DB: ${total}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
