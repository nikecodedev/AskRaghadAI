export type CategoryCardSeed = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  link: string;
  imageUrl: string;
  sortOrder: number;
};

/** Default homepage category cards seeded when the table is empty. */
export const DEFAULT_CATEGORY_CARDS: CategoryCardSeed[] = [
  {
    titleEn: "Fashion & Abayas",
    titleAr: "الأزياء والعبايات",
    descriptionEn: "Expert recommendations for modest fashion and abaya styles.",
    descriptionAr: "توصيات متخصصة للأزياء المحتشمة وستايلات العبايات.",
    link: "/chat?category=fashion",
    imageUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    sortOrder: 1,
  },
  {
    titleEn: "Beauty & Scents",
    titleAr: "الجمال والعطور",
    descriptionEn: "Discover perfumes, makeup, and beauty essentials with affiliate deals.",
    descriptionAr: "اكتشف العطور والمكياج وأساسيات الجمال مع عروض الشركاء.",
    link: "/chat?category=beauty",
    imageUrl:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    sortOrder: 2,
  },
  {
    titleEn: "Skincare",
    titleAr: "العناية بالبشرة",
    descriptionEn: "Personalized skincare advice tailored to Gulf climate.",
    descriptionAr: "نصائح عناية بالبشرة مناسبة لمناخ الخليج.",
    link: "/chat?category=skincare",
    imageUrl:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    sortOrder: 3,
  },
  {
    titleEn: "Home Decor & Kitchen",
    titleAr: "ديكور المنزل والمطبخ",
    descriptionEn: "Curated home and kitchen picks with store links and discount codes.",
    descriptionAr: "اختيارات منزلية ومطبخية مع روابط المتاجر وأكواد الخصم.",
    link: "/chat?category=home",
    imageUrl:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    sortOrder: 4,
  },
  {
    titleEn: "Kids & Baby Essentials",
    titleAr: "مستلزمات الأطفال والرضع",
    descriptionEn: "Trusted product guidance for mothers across the Gulf.",
    descriptionAr: "إرشاد موثوق للمنتجات للعائلات في منطقة الخليج.",
    link: "/chat?category=kids",
    imageUrl:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80",
    sortOrder: 5,
  },
  {
    titleEn: "Smart Travel Planning",
    titleAr: "تخطيط السفر الذكي",
    descriptionEn: "AI-assisted travel tips, packing lists, and destination advice.",
    descriptionAr: "نصائح سفر ذكية وقوائم تعبئة وإرشاد للوجهات.",
    link: "/chat?category=travel",
    imageUrl:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
    sortOrder: 6,
  },
];
