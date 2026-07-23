import type { Product } from "@prisma/client";
import affiliateRows from "../../../scripts/affiliate-links-data.json";
import { resolveProductCategory } from "@/lib/products/intent";

type AffiliateRow = {
  category: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  affiliateUrl: string | null;
  discountCode: string | null;
};

const CATEGORY_IMAGES: Record<string, string[]> = {
  fashion: [
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  ],
  beauty: [
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
  ],
  skincare: [
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
  ],
  home: [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  ],
  kids: [
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80",
  ],
  travel: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
  ],
};

/**
 * Deployment-safe affiliate fallback.
 *
 * Production still uses PostgreSQL first. This bundled catalog ensures a
 * relevant query can show shoppable cards even while a fresh Hostinger
 * deployment is waiting for its Product table to be seeded or Neon is briefly
 * unavailable.
 */
export function getBundledProductsForChat(options: {
  query?: string;
  category?: string;
  limit?: number;
}): Product[] {
  const { query = "", category, limit = 2 } = options;
  const resolvedCategory = resolveProductCategory(query, category);
  if (!resolvedCategory) return [];

  const now = new Date();
  const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  const perfumeQuery = /perfume|fragrance|scent|cologne|عطر|عطور|بخور/i.test(query);
  return (affiliateRows as AffiliateRow[])
    .filter(
      (row) =>
        row.category === resolvedCategory &&
        Boolean(row.affiliateUrl),
    )
    .sort((a, b) => {
      const score = (row: AffiliateRow) => {
        const text =
          `${row.nameEn} ${row.nameAr} ${row.descriptionEn} ${row.descriptionAr}`.toLowerCase();
        let value = words.filter((word) => text.includes(word)).length;
        if (
          perfumeQuery &&
          /perfume|fragrance|scent|عطر|عطور|beauty/i.test(text)
        ) {
          value += 5;
        }
        return value;
      };
      return score(b) - score(a);
    })
    .slice(0, limit)
    .map((row, index) => {
      const images = CATEGORY_IMAGES[resolvedCategory] ?? CATEGORY_IMAGES.beauty;
      return {
        id: `bundled-${resolvedCategory}-${index}`,
        category: resolvedCategory,
        nameEn: row.nameEn,
        nameAr: row.nameAr,
        descriptionEn: row.descriptionEn,
        descriptionAr: row.descriptionAr,
        imageUrl: images[index % images.length],
        price: null,
        currency: "SAR",
        affiliateUrl: row.affiliateUrl,
        discountCode: row.discountCode,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
    });
}
