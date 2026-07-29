import { prisma } from "@/lib/db/prisma";
import { resolveProductCategory } from "@/lib/products/intent";
import { servesCountry } from "@/lib/region/country-match";
import { identifyBundleComponents, identifySearchTerms } from "@/lib/rag/openai-rag";

export const CHAT_PRODUCTS_LIMIT = 2;
const MAX_AUTO_BUNDLE_ITEMS = 4;

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

/**
 * A partner only qualifies if it genuinely matches the request. Below this
 * it is dropped entirely rather than shown as a weak "best of a bad lot" —
 * which is what previously surfaced an eyewear store for an abaya query and
 * a perfume-only store for a mascara query.
 */
const MIN_RELEVANCE = 3;

/**
 * Umbrella terms added to a query purely for matching. Partner rows are
 * tagged at store level ("makeup", "skincare"), so a specific item request
 * ("mascara", "oily skin") has nothing to match against on its own. Mapping
 * the specific term to its category is what lets the strict relevance gate
 * above stay strict without simply returning nothing.
 */
const CONCEPT_EXPANSIONS: { pattern: RegExp; add: string }[] = [
  { pattern: /mascara|foundation|lipstick|lip gloss|eyeliner|eyeshadow|concealer|blush|كحل|مسكرا|أحمر شفاه|احمر شفاه|مكياج/i, add: "makeup cosmetics" },
  { pattern: /perfume|fragrance|cologne|scent|oud|incense|عطر|عطور|بخور|عود/i, add: "perfume perfumes fragrance" },
  // Expansion terms must stay specific. A generic token like a bare "care"
  // matches "Body Care", "Makeup & Care" and "Health Care & Eyes" alike, so
  // it silently reintroduces exactly the cross-category bleed this is meant
  // to prevent.
  { pattern: /serum|moisturi|cleanser|sunscreen|spf|acne|pimple|oily skin|dry skin|wrinkle|pores|face care|facial|بشرة|سيروم|حبوب|ترطيب/i, add: "skincare facial face" },
  { pattern: /body lotion|shower gel|body mist|body wash|body care|لوشن|غسول جسم/i, add: "body lotion" },
  { pattern: /shampoo|conditioner|hair dye|hair removal|hair care|شعر|شامبو/i, add: "hair haircare" },
  { pattern: /abaya|abayas|عباية|عبايات|عباءة/i, add: "abaya abayas modest" },
  // Partner tags are English-only, so Arabic terms for traditional menswear
  // need an explicit bridge or they match nothing.
  { pattern: /بشت|بشوت|مشلح|مشالح|bisht|mashlah/i, add: "bisht mashlah tradition" },
  { pattern: /handbag|purse|clutch|tote|حقيبة|شنطة|حقائب/i, add: "bags handbag handbags" },
  { pattern: /shoe|shoes|sneaker|heels|sandal|boots|حذاء|أحذية|احذية/i, add: "shoes footwear" },
  { pattern: /watch|watches|ساعة|ساعات/i, add: "watches" },
  // "accessories" is deliberately NOT included: it appears in the tags of
  // general clothing partners (G-Star RAW, Diesel, Shein), so adding it made
  // a jewellery query return jeans brands.
  { pattern: /jewel|jewelry|jewellery|gold|ring|necklace|earring|bracelet|مجوهرات|ذهب|خاتم|قلادة|أقراط/i, add: "jewelry jewellery" },
  { pattern: /hotel|hotels|resort|stay|accommodation|فندق|فنادق|إقامة/i, add: "hotel hotels booking" },
  { pattern: /flight|flights|airline|airfare|plane ticket|طيران|تذاكر طيران/i, add: "flight flights" },
  { pattern: /esim|e-sim|sim card|data plan|شريحة|اي سيم/i, add: "esim" },
  { pattern: /coffee|espresso|barista|قهوة|إسبريسو/i, add: "coffee" },
  { pattern: /diaper|stroller|baby bottle|حفاض|عربة أطفال|رضاعة/i, add: "baby kids" },
];

function expandQueryForMatching(query: string): string {
  let expanded = query;
  for (const { pattern, add } of CONCEPT_EXPANSIONS) {
    if (pattern.test(query)) expanded += ` ${add}`;
  }
  return expanded;
}

/**
 * Words too generic to be evidence that a partner sells what was asked for.
 * "face care" vs "Body Care" share only the word "care" — counting it would
 * score a body-lotion retailer as a facial-skincare match. Specific intent
 * still comes through via CONCEPT_EXPANSIONS ("face care" also contributes
 * "skincare facial face"), so dropping these loses no real signal.
 */
const GENERIC_QUERY_TOKENS = new Set([
  "care", "product", "products", "item", "items", "shop", "shopping", "store", "stores",
  "buy", "best", "good", "nice", "great", "recommend", "recommendation", "recommendations",
  "option", "options", "thing", "things", "online", "need", "want", "looking", "please",
  "gift", "gifts", "new", "top", "for", "the", "and", "with", "from",
  // Almost every clothing partner lists "accessories", so on its own it says
  // nothing about what a store actually sells.
  "accessories", "accessory",
]);

/** Splits into comparable word tokens, keeping Arabic letters intact. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9؀-ۿ]+/)
    .filter(Boolean);
}

/**
 * Token-level comparison rather than raw substring containment. Plain
 * `text.includes(word)` treats "men" as a match inside "women", which is how
 * a men's-gift query could pull a women's handbag partner.
 */
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 4 && longer.startsWith(shorter);
}

function countMatches(queryWords: string[], targetTokens: string[]): number {
  if (targetTokens.length === 0) return 0;
  return queryWords.filter((qw) => targetTokens.some((t) => tokensMatch(qw, t))).length;
}

/**
 * How well this partner actually matches the request — query signal only.
 * Deliberately excludes "has a photo"/"has a link" quality points: those are
 * unconditional, so folding them in here gave every irrelevant row a nonzero
 * score and made a strict relevance cutoff impossible.
 */
function productRelevance(product: ProductRow, expandedQuery: string): number {
  const queryWords = [...new Set(tokenize(expandedQuery))].filter(
    (w) => w.length >= 3 && !GENERIC_QUERY_TOKENS.has(w),
  );
  if (queryWords.length === 0) return 0;

  const subTokens = tokenize(product.subcategory ?? "");
  const tagTokens = tokenize(product.tags ?? "");
  const nameTokens = tokenize(`${product.nameEn} ${product.nameAr}`);
  const descTokens = tokenize(`${product.descriptionEn ?? ""} ${product.descriptionAr ?? ""}`);

  // Sheet-curated fields (subcategory, tags) are the most trustworthy signal
  // of what a partner actually sells; free-text description is the weakest.
  return (
    countMatches(queryWords, subTokens) * 6 +
    countMatches(queryWords, tagTokens) * 4 +
    countMatches(queryWords, nameTokens) * 3 +
    countMatches(queryWords, descTokens) * 1
  );
}

/** Presentation quality — only ever a tiebreaker between relevant partners. */
function productQualityBonus(product: ProductRow): number {
  return (product.imageUrl ? 3 : 0) + (product.affiliateUrl ? 2 : 0);
}

/** Expects an already-expanded query (see expandQueryForMatching). */
function rankByQueryRelevance(products: ProductRow[], expandedQuery: string): ProductRow[] {
  return products
    .map((product) => ({ product, relevance: productRelevance(product, expandedQuery) }))
    .filter((entry) => entry.relevance >= MIN_RELEVANCE)
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        productQualityBonus(b.product) - productQualityBonus(a.product),
    )
    .map((entry) => entry.product)
    // The sheet contains more than one row for some partners (two "Abaya
    // Amol" rows, for instance), which surfaced the same store twice in one
    // answer — the model then labelled the second one "(Alternative)" as if
    // it were a different shop. Keep only the best-scoring row per store.
    .filter((product, index, all) => {
      const key = product.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "");
      return all.findIndex((other) => other.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "") === key) === index;
    });
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

/**
 * Removes partners that explicitly serve a different country.
 *
 * A hard filter, not a preference. This previously fell back to the unfiltered
 * list whenever nothing matched, which re-admitted the very rows it had just
 * removed — that is how a shopper in Saudi Arabia was shown Nike UAE. The
 * client's rule is absolute: never surface another country's offer.
 *
 * Filtering strictly is safe because servesCountry treats a blank or wildcard
 * Target_Country ("global", "ALL") as serving everyone, and GCC as covering
 * all six Gulf states, so only rows scoped to other countries are dropped.
 * Returning nothing is the correct outcome when every candidate belongs
 * elsewhere: the caller then says it has no partner for that item, rather than
 * sending the shopper to a store that will not ship to them.
 */
function applyGeoFilter(products: ProductRow[], country?: string | null): ProductRow[] {
  if (!country) return products; // location unknown — never hide anything
  return products.filter((p) => servesCountry(p.targetCountries, country));
}

/** Shoppable, ranked candidate pool for a single search phrase (one bundle "piece" or a plain query). */
async function searchProducts(
  query: string,
  category?: string,
  take = 8,
  country?: string | null,
): Promise<ProductRow[]> {
  // Expand BEFORE resolving the category, not just before scoring: a specific
  // item like "mascara" or "oily skin" matches no category keyword on its own,
  // so category resolution would bail out and the search would return nothing
  // before the relevance logic ever ran. Expanding first lets "mascara" reach
  // beauty and "oily skin" reach skincare.
  const expandedQuery = expandQueryForMatching(query);
  const resolvedCategory = resolveProductCategory(expandedQuery, category);

  // When no category keyword matches, search the whole active catalog rather
  // than giving up. CATEGORY_KEYWORDS is a hand-maintained list, so anything
  // missing from it used to abort the search before the data was ever looked
  // at — which is why perfectly stocked items returned nothing ("coffee" is
  // absent from the home keywords, yet Coffee Break and Microlot Roastery are
  // both tagged "specialty coffee"). MIN_RELEVANCE, not the category filter,
  // is what keeps results honest, so widening the pool here costs no
  // precision: an unmatched query still returns nothing.
  const shoppableAnyCategory = {
    active: true,
    AND: [{ affiliateUrl: { not: null } }, { NOT: { affiliateUrl: "" } }],
  };

  // Rank the FULL shoppable pool, then keep only partners that clear
  // MIN_RELEVANCE. Returning nothing is the correct answer when the catalog
  // has no genuine match — surfacing the least-bad row instead is what
  // produced eyewear for abaya queries and perfume stores for mascara.
  const pool = await prisma.product.findMany({
    where: resolvedCategory ? { ...shoppableAnyCategory, category: resolvedCategory } : shoppableAnyCategory,
    orderBy: { updatedAt: "desc" },
  });
  const ranked = rankByQueryRelevance(pool, expandedQuery);
  if (ranked.length > 0 || !resolvedCategory) {
    return applyGeoFilter(ranked, country).slice(0, take);
  }

  // The category guess produced nothing, which usually means the guess itself
  // was wrong rather than that we have no stock: category scoring keys off
  // single words, so "baby clothes" lands in fashion (via "clothes") and
  // "Holiday Home Rentals" lands in home (via "home") even though the real
  // matches sit in kids and travel. Retry across every category before
  // concluding there is nothing to show — the relevance gate still applies,
  // so a genuinely unmatched query keeps returning nothing.
  const widePool = await prisma.product.findMany({
    where: shoppableAnyCategory,
    orderBy: { updatedAt: "desc" },
  });
  return applyGeoFilter(rankByQueryRelevance(widePool, expandedQuery), country).slice(0, take);
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
  country?: string | null;
}): Promise<{ products: ProductRow[]; isBundle: boolean }> {
  const { query = "", category, limit = CHAT_PRODUCTS_LIMIT, locale = "en", country } = options;
  const wantsBundle = BUNDLE_INTENT_HINT.test(query);
  const ranked = await searchProducts(query, category, Math.max(limit * 4, 8), country);

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

/**
 * Single-item lookup used by the chat AI's find_products tool: it calls this
 * with a short, specific phrase for ONE concrete item it is about to
 * recommend (e.g. "eSIM UK", "evening dress"), right as it writes that part
 * of the answer — replacing the old approach of guessing a fixed product set
 * up front and appending it after the fact regardless of what the reply
 * actually ended up saying.
 */
export async function findProductsForItem(
  item: string,
  category?: string,
  take = 3,
  country?: string | null,
): Promise<ProductRow[]> {
  return searchProducts(item, category, take, country);
}

export async function listAllProducts() {
  return prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
}
