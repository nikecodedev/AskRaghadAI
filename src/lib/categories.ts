export const CATEGORIES = [
  { id: "fashion", nameEn: "Fashion & Abayas", nameAr: "الأزياء والعبايات" },
  { id: "beauty", nameEn: "Beauty & Scents", nameAr: "الجمال والعطور" },
  { id: "skincare", nameEn: "Skincare", nameAr: "العناية بالبشرة" },
  { id: "home", nameEn: "Home Decor & Kitchen", nameAr: "ديكور المنزل والمطبخ" },
  { id: "kids", nameEn: "Kids & Baby Essentials", nameAr: "مستلزمات الأطفال والرضع" },
  { id: "travel", nameEn: "Smart Travel Planning", nameAr: "تخطيط السفر الذكي" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function getCategoryLabel(id: string, locale: "en" | "ar") {
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) return id;
  return locale === "ar" ? cat.nameAr : cat.nameEn;
}
