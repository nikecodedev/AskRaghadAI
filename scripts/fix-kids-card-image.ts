import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const NEW_KIDS_IMAGE =
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = neon(url);

  const updated = await sql`
    UPDATE "CategoryCard"
    SET
      "imageUrl" = ${NEW_KIDS_IMAGE},
      "updatedAt" = NOW()
    WHERE "titleEn" = 'Kids & Baby Essentials'
       OR "link" LIKE '%category=kids%'
    RETURNING "id", "titleEn", "imageUrl"
  `;

  console.log("Updated rows:", updated.length);
  for (const row of updated) {
    console.log(row);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
