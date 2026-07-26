import { prisma } from "@/lib/db/prisma";
import { resolveProductCategory } from "@/lib/products/intent";
import { identifyBundleComponents } from "@/lib/rag/openai-rag";

export const CHAT_PRODUCTS_LIMIT = 2;
const MAX_AUTO_BUNDLE_ITEMS = 4;

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

/** Shoppable, ranked candidate pool for a single search phrase (one bundle "piece" or a plain query). */
async function searchProducts(query: string, category?: string, take = 8): Promise<ProductRow[]> {
  const resolvedCategory = resolveProductCategory(query, category);
  if (!resolvedCategory) return [];

  const shoppable = {
    active: true,
    category: resolvedCategory,
    AND: [{ affiliateUrl: { not: null } }, { NOT: { affiliateUrl: "" } }],
  };

  const withPhotos = await prisma.product.findMany({
    where: { ...shoppable, NOT: { OR: [{ imageUrl: null }, { imageUrl: "" }] } },
    orderBy: { updatedAt: "desc" },
    take,
  });

  const pool =
    withPhotos.length > 0
      ? withPhotos
      : await prisma.product.findMany({ where: shoppable, orderBy: { updatedAt: "desc" }, take });

  return rankByQueryRelevance(pool, query);
}

/**
 * Auto-assembles a bundle across unrelated partners when no one has
 * pre-linked a Bundle_ID: asks the AI what pieces the request implies (e.g.
 * "wedding outfit" -> abaya, bag, shoes), then finds the single best real,
 * purchasable match for each piece — possibly from different stores
 * entirely — and combines them into one set with individual buy links.
 */
async function autoAssembleBundle(
  query: string,
  category: string | undefined,
  locale: "en" | "ar",
): Promise<ProductRow[]> {
  const components = await identifyBundleComponents(query, locale);
  if (components.length < 2) return [];

  const seenIds = new Set<string>();
  const items: ProductRow[] = [];

  for (const piece of components) {
    if (items.length >= MAX_AUTO_BUNDLE_ITEMS) break;
    const matches = await searchProducts(piece, category, 6);
    const best = matches.find((p) => !seenIds.has(p.id));
    if (best) {
      seenIds.add(best.id);
      items.push(best);
    }
  }

  return items;
}

export async function getProductsForChat(options: {
  query?: string;
  category?: string;
  limit?: number;
  locale?: "en" | "ar";
}): Promise<{ products: ProductRow[]; isBundle: boolean }> {
  const { query = "", category, limit = CHAT_PRODUCTS_LIMIT, locale = "en" } = options;
  const ranked = await searchProducts(query, category, Math.max(limit * 4, 8));

  if (ranked.length === 0) {
    return { products: [], isBundle: false };
  }

  const topMatch = ranked[0];
  const wantsBundle = BUNDLE_INTENT_HINT.test(query);

  if (wantsBundle) {
    // Prefer a real, deliberately pre-linked set (e.g. an official package
    // deal) when one exists — only fall back to auto-assembly otherwise.
    if (topMatch.bundleId) {
      const group = await fetchBundleGroup(topMatch.bundleId);
      if (group.length > 1) return { products: group, isBundle: true };
    }

    const assembled = await autoAssembleBundle(query, category, locale);
    if (assembled.length > 1) return { products: assembled, isBundle: true };
  }

  return { products: ranked.slice(0, limit), isBundle: false };
}

export async function listAllProducts() {
  return prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
}
