// Maps the client's human-readable category labels in the Google Sheet to the
// app's fixed internal category ids (see src/lib/categories.ts).
const SHEET_CATEGORY_TO_ID: Record<string, string> = {
  "complete fashion & style": "fashion",
  "beauty, perfumes & makeup": "beauty",
  "personal care & skincare": "skincare",
  "kitchen, lifestyle & coffee world": "home",
  "maternity, kids & baby care": "kids",
  "smart travel & trips": "travel",
};

const ID_TO_SHEET_CATEGORY: Record<string, string> = {
  fashion: "Complete Fashion & Style",
  beauty: "Beauty, Perfumes & Makeup",
  skincare: "Personal Care & Skincare",
  home: "Kitchen, lifestyle & Coffee World",
  kids: "Maternity, Kids & Baby care",
  travel: "Smart Travel & Trips",
};

export function sheetCategoryToId(label: string): string {
  const key = label.trim().toLowerCase();
  return SHEET_CATEGORY_TO_ID[key] ?? key.replace(/[^a-z0-9]+/g, "-");
}

export function idToSheetCategory(id: string): string {
  return ID_TO_SHEET_CATEGORY[id] ?? id;
}
