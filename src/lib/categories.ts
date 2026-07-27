// Titles here must stay in sync with the CategoryCard rows shown on the
// homepage (managed in the admin panel) — these are the official category
// names/titles the client set, reused wherever the AI or chat UI needs a
// short category label (system prompt, in-chat "browse categories" links,
// fallback messages) rather than the full homepage card content.
export const CATEGORIES = [
  { id: "fashion", nameEn: "Complete Fashion & Style", nameAr: "الأزياء والأناقة المتكاملة" },
  { id: "beauty", nameEn: "Beauty, Perfumes & Makeup", nameAr: "الجمال والعطور والمكياج" },
  { id: "skincare", nameEn: "Personal Care & Skincare", nameAr: "العناية الشخصية والبشرة" },
  { id: "home", nameEn: "Kitchen, Lifestyle & Coffee World", nameAr: "المطبخ، أسلوب الحياة وعالم القهوة" },
  { id: "kids", nameEn: "Maternity, Kids & Baby Care", nameAr: "الأمومة والطفولة والرضع" },
  { id: "travel", nameEn: "Smart Travel & Trips", nameAr: "السفر والرحلات الذكية" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function getCategoryLabel(id: string, locale: "en" | "ar") {
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) return id;
  return locale === "ar" ? cat.nameAr : cat.nameEn;
}
