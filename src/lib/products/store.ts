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
  const subcategoryText = (product.subcategory ?? "").toLowerCase();
  const tagsText = (product.tags ?? "").toLowerCase();

  let score =
    (text.includes(q) ? 5 : 0) +
    q.split(/\s+/).filter((w) => w.length > 2 && text.includes(w)).length;

  // A specific request like "abaya" should strongly prefer a partner whose
  // sheet subcategory/tags actually say Abaya, over a generic marketplace
  // (Amazon, Noon) that only matches on loose keyword overlap.
  if (subcategoryText) {
    score += q.split(/\s+/).filter((w) => w.length > 2 && subcategoryText.includes(w)).length * 6;
  }
  if (tagsText) {
    score += q.split(/\s+/).filter((w) => w.length > 2 && tagsText.includes(w)).length * 4;
  }

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

// Explicit "give me the whole thing" language — this is what distinguishes
// "I need a travel bag" (single item + one optional add-on) from "plan a
// trip to London" or "I have a wedding next week" (full assembled set).
const BUNDLE_INTENT_HINT =
  /\b(outfit|full set|complete set|bundle|whole trip|entire trip|plan a trip|plan my trip)\b|طقم|أطقم|كامل|خطة سفر|رحلة كاملة|تجهيز(ة)?/i;

async function fetchBundleGroup(bundleId: string) {
  const items = await prisma.product.findMany({
    where: { active: true, bundleId },
    orderBy: { itemRole: "asc" }, // "main" sorts before "complementary" alphabetically
  });
  return items;
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

  const ranked = rankByQueryRelevance(pool, query);
  const topMatch = ranked[0];

  // On-demand complete set: the user explicitly asked for an outfit/trip/set
  // and the best match belongs to a bundle — pull in every item that shares
  // its Bundle_ID, regardless of the normal card limit.
  if (topMatch?.bundleId && BUNDLE_INTENT_HINT.test(query)) {
    const group = await fetchBundleGroup(topMatch.bundleId);
    if (group.length > 1) return group;
  }

  return ranked.slice(0, limit);
}

export async function listAllProducts() {
  return prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
}
