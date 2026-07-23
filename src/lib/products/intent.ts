import type { CategoryId } from "@/lib/categories";

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  fashion: [
    "abaya",
    "abayas",
    "fashion",
    "dress",
    "modest",
    "outfit",
    "clothing",
    "clothes",
    "namshi",
    "vogacloset",
    "عباية",
    "عبايات",
    "أزياء",
    "ازياء",
    "موضة",
    "فستان",
    "ملابس",
    "عباءة",
  ],
  beauty: [
    "perfume",
    "perfumes",
    "makeup",
    "scent",
    "fragrance",
    "cologne",
    "beauty",
    "oud",
    "عطر",
    "عطور",
    "مكياج",
    "جمال",
    "بخور",
    "عود",
    "اريد عطر",
    "أريد عطر",
  ],
  skincare: [
    "skincare",
    "skin care",
    "cream",
    "serum",
    "moistur",
    "cleanser",
    "بشرة",
    "عناية بالبشرة",
    "كريم",
    "روتين",
    "سيروم",
  ],
  home: [
    "home",
    "kitchen",
    "decor",
    "furniture",
    "noon",
    "منزل",
    "مطبخ",
    "ديكور",
    "أثاث",
    "اثاث",
  ],
  kids: [
    "baby",
    "kids",
    "kid",
    "child",
    "children",
    "toddler",
    "أطفال",
    "اطفال",
    "رضع",
    "طفل",
    "مستلزمات الأطفال",
  ],
  travel: [
    "hotel",
    "hotels",
    "flight",
    "flights",
    "travel",
    "trip",
    "booking",
    "dubai",
    "vacation",
    "itinerary",
    "eSIM",
    "esim",
    "رحلة",
    "سفر",
    "فندق",
    "فنادق",
    "طيران",
    "حجز",
    "سياحة",
    "تذاكر",
    "دبي",
    "بوكينج",
  ],
};

/** Soft shopping intent that should still surface affiliate cards. */
const GENERAL_SHOPPING_HINT =
  /recommend|recommendation|gift|shop|buy|purchase|affiliate|deal|هدية|هدايا|توصية|توصيات|اشتري|شراء|تسوق|عرض|عروض/i;

function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .trim();
}

/** Score how well a query matches a product category (higher = better). */
export function scoreCategoryMatch(query: string, category: CategoryId): number {
  const normalized = normalizeForMatch(query);
  const raw = query.trim();
  let score = 0;

  for (const keyword of CATEGORY_KEYWORDS[category]) {
    const kw = normalizeForMatch(keyword);
    if (normalized.includes(kw) || raw.includes(keyword)) {
      score += kw.length >= 4 ? 2 : 1;
    }
  }

  return score;
}

/** Pick the best category from explicit URL param or chat query intent. */
export function resolveProductCategory(
  query: string,
  explicitCategory?: string,
): CategoryId | undefined {
  const validIds = Object.keys(CATEGORY_KEYWORDS) as CategoryId[];

  if (explicitCategory && validIds.includes(explicitCategory as CategoryId)) {
    return explicitCategory as CategoryId;
  }

  let best: CategoryId | undefined;
  let bestScore = 0;

  for (const category of validIds) {
    const score = scoreCategoryMatch(query, category);
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  if (bestScore > 0) return best;

  // Vague shopping questions should still open shoppable cards instead of
  // leaving the user with plain text and no affiliate photos/links.
  if (GENERAL_SHOPPING_HINT.test(query)) {
    return "beauty";
  }

  return undefined;
}
