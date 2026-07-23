/**
 * Create default category cards via Neon HTTP (no Prisma transactions).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { DEFAULT_CATEGORY_CARDS } from "../src/lib/category-cards/defaults";
import { randomBytes } from "crypto";

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

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

  const existing = await sql`SELECT COUNT(*)::int AS count FROM "CategoryCard"`;
  const count = Number(existing[0]?.count ?? 0);
  if (count > 0) {
    console.log(`CategoryCard already has ${count} rows — skip seed`);
    return;
  }

  for (const card of DEFAULT_CATEGORY_CARDS) {
    const id = cuidLike();
    await sql`
      INSERT INTO "CategoryCard" (
        "id", "titleEn", "titleAr", "descriptionEn", "descriptionAr",
        "link", "imageUrl", "sortOrder", "active", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${card.titleEn}, ${card.titleAr}, ${card.descriptionEn}, ${card.descriptionAr},
        ${card.link}, ${card.imageUrl}, ${card.sortOrder}, true, NOW(), NOW()
      )
    `;
  }

  const after = await sql`SELECT COUNT(*)::int AS count FROM "CategoryCard"`;
  console.log(`Category cards seeded: ${after[0]?.count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
