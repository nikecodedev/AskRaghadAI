import { prisma } from "@/lib/db/prisma";
import { resolveProductCategory } from "@/lib/products/intent";

export const CHAT_PRODUCTS_LIMIT = 2;

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

const PERFUME_HINT =
  /perfume|perfumes|fragrance|scent|cologne|عطر|عطور|بخور/i;

function productScore(product: ProductRow, query: string) {
  if (!query.trim()) return product.imageUrl ? 1 : 0;
  const q = query.toLowerCase();
  const text =
    `${product.nameEn} ${product.nameAr} ${product.descriptionEn ?? ""} ${product.descriptionAr ?? ""}`.toLowerCase();

  let score =
    (text.includes(q) ? 5 : 0) +
    q.split(/\s+/).filter((w) => w.length > 2 && text.includes(w)).length;

  // Prefer perfume-named partners when the user asks for perfume / عطر.
  if (PERFUME_HINT.test(query) && PERFUME_HINT.test(text)) score += 8;
  // Always prefer cards that have a real product photo (never AG logo fallback).
  if (product.imageUrl) score += 3;
  if (product.affiliateUrl) score += 2;

  return score;
}

function rankByQueryRelevance(products: ProductRow[], query: string) {
  return [...products].sort(
    (a, b) => productScore(b, query) - productScore(a, query),
  );
}

export async function getProductsForChat(options: {
  query?: string;
  category?: string;
  limit?: number;
}) {
  const { query = "", category, limit = CHAT_PRODUCTS_LIMIT } = options;
  const resolvedCategory = resolveProductCategory(query, category);

  // No intent match — do not show unrelated cards (e.g. Noon for abaya queries).
  if (!resolvedCategory) {
    return [];
  }

  const shoppable = {
    active: true,
    category: resolvedCategory,
    AND: [{ affiliateUrl: { not: null } }, { NOT: { affiliateUrl: "" } }],
  };

  const products = await prisma.product.findMany({
    where: {
      ...shoppable,
      // Prefer rows that already have a shoppable photo.
      NOT: { OR: [{ imageUrl: null }, { imageUrl: "" }] },
    },
    orderBy: { updatedAt: "desc" },
    take: Math.max(limit * 4, 8),
  });

  // Fallback if every row somehow lacks an image (still return shoppable links).
  const pool =
    products.length > 0
      ? products
      : await prisma.product.findMany({
          where: shoppable,
          orderBy: { updatedAt: "desc" },
          take: Math.max(limit * 4, 8),
        });

  return rankByQueryRelevance(pool, query).slice(0, limit);
}

export async function listAllProducts() {
  return prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
}
