import { getNeonSql } from "@/lib/db/neon-http";
import { DEFAULT_CATEGORY_CARDS } from "@/lib/category-cards/defaults";
import { randomBytes } from "crypto";

export type CategoryCardRecord = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  link: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

function firstRow<T>(rows: unknown): T | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as T;
}

function allRows<T>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows as T[];
}

let ensurePromise: Promise<void> | null = null;

export async function ensureDefaultCategoryCards() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const sql = getNeonSql();
      const existing = await sql`SELECT COUNT(*)::int AS count FROM "CategoryCard"`;
      const count = Number(firstRow<{ count: number }>(existing)?.count ?? 0);
      if (count > 0) return;

      for (const card of DEFAULT_CATEGORY_CARDS) {
        const id = cuidLike();
        await sql`
          INSERT INTO "CategoryCard" (
            id, "titleEn", "titleAr", "descriptionEn", "descriptionAr",
            link, "imageUrl", "sortOrder", active, "createdAt", "updatedAt"
          ) VALUES (
            ${id}, ${card.titleEn}, ${card.titleAr}, ${card.descriptionEn}, ${card.descriptionAr},
            ${card.link}, ${card.imageUrl}, ${card.sortOrder}, true, NOW(), NOW()
          )
        `;
      }
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
}

export async function listActiveCategoryCards(): Promise<CategoryCardRecord[]> {
  await ensureDefaultCategoryCards();
  const sql = getNeonSql();
  const rows = await sql`
    SELECT id, "titleEn", "titleAr", "descriptionEn", "descriptionAr",
           link, "imageUrl", "sortOrder", active
    FROM "CategoryCard"
    WHERE active = true
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `;
  return allRows<CategoryCardRecord>(rows);
}

export async function listAllCategoryCards(): Promise<CategoryCardRecord[]> {
  await ensureDefaultCategoryCards();
  const sql = getNeonSql();
  const rows = await sql`
    SELECT id, "titleEn", "titleAr", "descriptionEn", "descriptionAr",
           link, "imageUrl", "sortOrder", active
    FROM "CategoryCard"
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `;
  return allRows<CategoryCardRecord>(rows);
}

export async function createCategoryCard(data: {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  link: string;
  imageUrl: string;
  sortOrder: number;
  active?: boolean;
}): Promise<CategoryCardRecord> {
  const sql = getNeonSql();
  const id = cuidLike();
  const rows = await sql`
    INSERT INTO "CategoryCard" (
      id, "titleEn", "titleAr", "descriptionEn", "descriptionAr",
      link, "imageUrl", "sortOrder", active, "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${data.titleEn}, ${data.titleAr}, ${data.descriptionEn}, ${data.descriptionAr},
      ${data.link}, ${data.imageUrl}, ${data.sortOrder}, ${data.active !== false}, NOW(), NOW()
    )
    RETURNING id, "titleEn", "titleAr", "descriptionEn", "descriptionAr",
              link, "imageUrl", "sortOrder", active
  `;
  const card = firstRow<CategoryCardRecord>(rows);
  if (!card) throw new Error("Failed to create category card");
  return card;
}

export async function updateCategoryCard(
  id: string,
  data: Partial<Omit<CategoryCardRecord, "id">>,
): Promise<CategoryCardRecord> {
  const sql = getNeonSql();
  const current = await sql`
    SELECT id, "titleEn", "titleAr", "descriptionEn", "descriptionAr",
           link, "imageUrl", "sortOrder", active
    FROM "CategoryCard" WHERE id = ${id} LIMIT 1
  `;
  const row = firstRow<CategoryCardRecord>(current);
  if (!row) throw new Error("Category card not found");

  const merged = {
    titleEn: data.titleEn ?? row.titleEn,
    titleAr: data.titleAr ?? row.titleAr,
    descriptionEn: data.descriptionEn ?? row.descriptionEn,
    descriptionAr: data.descriptionAr ?? row.descriptionAr,
    link: data.link ?? row.link,
    imageUrl: data.imageUrl ?? row.imageUrl,
    sortOrder: data.sortOrder ?? row.sortOrder,
    active: data.active ?? row.active,
  };

  const updatedRows = await sql`
    UPDATE "CategoryCard"
    SET "titleEn" = ${merged.titleEn},
        "titleAr" = ${merged.titleAr},
        "descriptionEn" = ${merged.descriptionEn},
        "descriptionAr" = ${merged.descriptionAr},
        link = ${merged.link},
        "imageUrl" = ${merged.imageUrl},
        "sortOrder" = ${merged.sortOrder},
        active = ${merged.active},
        "updatedAt" = NOW()
    WHERE id = ${id}
    RETURNING id, "titleEn", "titleAr", "descriptionEn", "descriptionAr",
              link, "imageUrl", "sortOrder", active
  `;
  const updated = firstRow<CategoryCardRecord>(updatedRows);
  if (!updated) throw new Error("Failed to update category card");
  return updated;
}

export async function deleteCategoryCard(id: string): Promise<void> {
  const sql = getNeonSql();
  await sql`DELETE FROM "CategoryCard" WHERE id = ${id}`;
}

export async function getNextCategorySortOrder(): Promise<number> {
  const sql = getNeonSql();
  const rows = await sql`SELECT COALESCE(MAX("sortOrder"), 0)::int AS max FROM "CategoryCard"`;
  return Number(firstRow<{ max: number }>(rows)?.max ?? 0) + 1;
}
