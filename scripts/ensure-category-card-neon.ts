/**
 * Create CategoryCard via Neon HTTP (no Prisma native engine).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = neon(url);

  await sql`
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
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "CategoryCard_active_sortOrder_idx"
    ON "CategoryCard"("active", "sortOrder")
  `;

  const rows = await sql`SELECT COUNT(*)::int AS count FROM "CategoryCard"`;
  console.log("CategoryCard ready. rows=", rows[0]?.count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
