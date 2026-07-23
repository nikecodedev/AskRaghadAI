import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating CategoryCard table if missing...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CategoryCard" (
      "id" TEXT NOT NULL,
      "titleEn" TEXT NOT NULL,
      "titleAr" TEXT NOT NULL,
      "descriptionEn" TEXT NOT NULL,
      "descriptionAr" TEXT NOT NULL,
      "link" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CategoryCard_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CategoryCard_active_sortOrder_idx"
    ON "CategoryCard"("active", "sortOrder");
  `);

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "CategoryCard"`,
  );
  console.log("CategoryCard rows:", Number(count[0]?.count ?? 0));
  console.log("OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
