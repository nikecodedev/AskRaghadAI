import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../src/lib/db/prisma";

type AffiliateRow = {
  category: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  affiliateUrl: string | null;
  discountCode: string | null;
};

/** Real product-style photos (not brand logos) for chat affiliate cards. */
const CATEGORY_IMAGES: Record<string, string[]> = {
  fashion: [
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80",
  ],
  beauty: [
    // Perfume bottles / fragrance — primary for "I want perfume"
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
  ],
  skincare: [
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1570194065650-d99fb4b38b17?auto=format&fit=crop&w=800&q=80",
  ],
  home: [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
  ],
  kids: [
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80",
  ],
  travel: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1436491865332-7a61a1098800?auto=format&fit=crop&w=800&q=80",
  ],
};

const PERFUME_KEYWORDS = /perfume|عطر|fragrance|scent|cologne|ysl|bath.?body|nazih/i;

function pickImage(category: string, nameEn: string, index: number): string {
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.fashion;
  // Perfume-named partners always get a perfume-bottle photo from the beauty pool.
  if (PERFUME_KEYWORDS.test(nameEn) || category === "beauty") {
    const beauty = CATEGORY_IMAGES.beauty;
    return beauty[index % beauty.length];
  }
  return pool[index % pool.length];
}

async function main() {
  const dataPath = path.join(__dirname, "affiliate-links-data.json");
  const rows = JSON.parse(readFileSync(dataPath, "utf8")) as AffiliateRow[];

  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    const existing = await prisma.product.findFirst({
      where: { nameEn: p.nameEn, category: p.category },
    });

    const imageUrl = pickImage(p.category, p.nameEn, i);

    const data = {
      category: p.category,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      descriptionEn: p.descriptionEn,
      descriptionAr: p.descriptionAr,
      affiliateUrl: p.affiliateUrl,
      discountCode: p.discountCode,
      imageUrl,
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

  // Backfill / refresh images for every active product (replace logo placeholders).
  const all = await prisma.product.findMany({ where: { active: true } });
  let refreshed = 0;
  for (let i = 0; i < all.length; i++) {
    const product = all[i];
    const nextImage = pickImage(product.category, product.nameEn, i);
    if (product.imageUrl !== nextImage) {
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: nextImage },
      });
      refreshed++;
    }
  }

  const total = await prisma.product.count({ where: { active: true } });
  const withImages = await prisma.product.count({
    where: { active: true, imageUrl: { not: null } },
  });
  const beauty = await prisma.product.count({
    where: { active: true, category: "beauty", affiliateUrl: { not: null } },
  });
  console.log(`XLSX affiliate seed: ${created} created, ${updated} updated, ${refreshed} images refreshed.`);
  console.log(`Active: ${total}, with images: ${withImages}, beauty shoppable: ${beauty}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
