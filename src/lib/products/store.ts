import { prisma } from "@/lib/db/prisma";
import { resolveProductCategory } from "@/lib/products/intent";
import { identifyBundleComponents, identifySearchTerms } from "@/lib/rag/openai-rag";

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

  // Rank the FULL shoppable pool for the category (not just an arbitrary
  // "most recently updated" slice, and not photo-having rows only). The
  // sheet sometimes has two rows per partner — one with an image, one with
  // the real subcategory/tags but no image — and a hard photo-first filter
  // was silently discarding the far more relevant tag-matched row whenever
  // any photo row existed. productScore() already rewards a real photo
  // (+3), so a genuine match with no photo still loses to an equally
  // relevant match that has one — it just no longer loses to an irrelevant
  // partner purely because that partner happens to have a stock photo.
  const pool = await prisma.product.findMany({ where: shoppable, orderBy: { updatedAt: "desc" } });
  return rankByQueryRelevance(pool, query).slice(0, take);
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

  // Resolve a category once from the overall request (or the first piece
  // that happens to match a keyword) and reuse it for every piece, instead
  // of gating each piece behind its own keyword match. Generic AI-generated
  // piece names like "veil" or "clutch" often don't hit CATEGORY_KEYWORDS on
  // their own even though the bundle as a whole clearly belongs to one
  // category — without this, one ungated piece silently drops the whole
  // bundle below the 2-item threshold and the assembly is thrown away.
  const sharedCategory =
    resolveProductCategory(query, category) ??
    components.reduce<string | undefined>(
      (found, piece) => found ?? resolveProductCategory(piece),
      undefined,
    );
  const effectiveCategory = sharedCategory ?? category;

  const seenIds = new Set<string>();
  const items: ProductRow[] = [];

  for (const piece of components) {
    if (items.length >= MAX_AUTO_BUNDLE_ITEMS) break;
    const matches = await searchProducts(piece, effectiveCategory, 6);
    const best = matches.find((p) => !seenIds.has(p.id));
    if (best) {
      seenIds.add(best.id);
      items.push(best);
    }
  }

  return items;
}

/**
 * AI-assisted fallback used only when plain keyword matching finds nothing.
 * Handles natural phrasing that doesn't hit CATEGORY_KEYWORDS at all (e.g.
 * "what should I wear to a wedding?"), for both single-item and multi-item
 * (non-bundle) requests. Returns [] if identifySearchTerms decides the
 * message isn't a product request at all.
 */
async function aiAssistedSearch(
  query: string,
  category: string | undefined,
  locale: "en" | "ar",
  limit: number,
): Promise<ProductRow[]> {
  const terms = await identifySearchTerms(query, locale);
  if (terms.length === 0) return [];

  const seenIds = new Set<string>();
  const items: ProductRow[] = [];

  for (const term of terms) {
    if (items.length >= limit) break;
    const matches = await searchProducts(term, category, 6);
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
  const wantsBundle = BUNDLE_INTENT_HINT.test(query);
  const ranked = await searchProducts(query, category, Math.max(limit * 4, 8));

  // Bundle intent is checked independently of whether the raw query resolved
  // a category above — autoAssembleBundle does its own per-piece category
  // resolution via the AI, so it can succeed even when the full raw query
  // ("plan my trip", "wedding outfit please") doesn't hit any single keyword.
  if (wantsBundle) {
    const topMatch = ranked[0];
    // Prefer a real, deliberately pre-linked set (e.g. an official package
    // deal) when one exists — only fall back to auto-assembly otherwise.
    if (topMatch?.bundleId) {
      const group = await fetchBundleGroup(topMatch.bundleId);
      if (group.length > 1) return { products: group, isBundle: true };
    }

    const assembled = await autoAssembleBundle(query, category, locale);
    if (assembled.length > 1) return { products: assembled, isBundle: true };
  }

  if (ranked.length > 0) {
    return { products: ranked.slice(0, limit), isBundle: false };
  }

  // Keyword matching found nothing at all — most real chat messages don't
  // use our exact keyword list, so ask the AI what's actually being asked
  // for before giving up and leaving the reply with no product cards.
  const aiFound = await aiAssistedSearch(query, category, locale, wantsBundle ? MAX_AUTO_BUNDLE_ITEMS : limit);
  if (aiFound.length > 0) {
    return { products: aiFound, isBundle: wantsBundle && aiFound.length > 1 };
  }

  return { products: [], isBundle: false };
}

export async function listAllProducts() {
  return prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
}
