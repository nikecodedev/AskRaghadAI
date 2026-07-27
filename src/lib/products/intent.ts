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
    "mashlah",
    "mashlahs",
    "bisht",
    "jewelry",
    "handbag",
    "shoes",
    "sneakers",
    "watch",
    "sunglasses",
    "عباية",
    "عبايات",
    "أزياء",
    "ازياء",
    "موضة",
    "فستان",
    "ملابس",
    "عباءة",
    "مشلح",
    "بشت",
    "مجوهرات",
    "حقيبة",
    "حذاء",
    "ساعة",
    "نظارة شمسية",
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
    "lotion",
    "body care",
    "body wash",
    "shower gel",
    "sunscreen",
    "facial",
    "بشرة",
    "عناية بالبشرة",
    "كريم",
    "روتين",
    "سيروم",
    "لوشن",
    "غسول",
  ],
  home: [
    "home",
    "kitchen",
    "kitchenware",
    "decor",
    "furniture",
    "noon",
    // "Kitchen, lifestyle & Coffee World" — coffee is a headline part of this
    // category and the catalog stocks it (Coffee Break, Microlot Roastery),
    // so it must be matchable here.
    "coffee",
    "espresso",
    "barista",
    "roastery",
    "appliance",
    "appliances",
    "منزل",
    "مطبخ",
    "ديكور",
    "أثاث",
    "اثاث",
    "قهوة",
    "كوفي",
    "إسبريسو",
    "اسبريسو",
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

/**
 * Pick the best category for a query. What the query's own words say always
 * wins — the page the user happens to be browsing (explicitCategory) is only
 * a fallback for when the query itself is too generic to resolve anything
 * (e.g. "recommend something nice" on the Beauty page). Without this
 * priority, a user on the Fashion page asking about "a hotel in Paris" would
 * get fashion results force-matched onto an unrelated travel request.
 */
export function resolveProductCategory(
  query: string,
  explicitCategory?: string,
): CategoryId | undefined {
  const validIds = Object.keys(CATEGORY_KEYWORDS) as CategoryId[];

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

  if (explicitCategory && validIds.includes(explicitCategory as CategoryId)) {
    return explicitCategory as CategoryId;
  }

  return undefined;
}
