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
    titleEn: "Complete Fashion & Style",
    titleAr: "الأزياء والأناقة المتكاملة",
    descriptionEn: "Expert recommendations for modern apparel, dresses, abayas, women's handbags and men's essentials.",
    descriptionAr: "توصيات متخصصة للأزياء والفساتين والعبايات والشنط النسائية ومستلزمات رجالية.",
    link: "/chat?category=fashion",
    imageUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    sortOrder: 1,
  },
  {
    titleEn: "Beauty, Perfumes & Makeup",
    titleAr: "الجمال والعطور والمكياج",
    descriptionEn: "Discover luxury perfumes, makeup, and beauty essentials.",
    descriptionAr: "اكتشف العطور الفاخرة والمكياج وأساسيات الجمال.",
    link: "/chat?category=beauty",
    imageUrl:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    sortOrder: 2,
  },
  {
    titleEn: "Personal Care & Skincare",
    titleAr: "العناية الشخصية والبشرة",
    descriptionEn: "Smart consultations and advanced personal care solution.",
    descriptionAr: "استشارات ذكية وحلول متكاملة للعناية الشخصية والبشرة.",
    link: "/chat?category=skincare",
    imageUrl:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    sortOrder: 3,
  },
  {
    titleEn: "Kitchen, Lifestyle & Coffee World",
    titleAr: "المطبخ، أسلوب الحياة وعالم القهوة",
    descriptionEn: "Smart recommendations for home decor, kitchenware, and specialty coffee gear.",
    descriptionAr: "استشارات ذكية لاختيار أدوات المطبخ والديكور ومستلزمات القهوة.",
    link: "/chat?category=home",
    imageUrl:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    sortOrder: 4,
  },
  {
    titleEn: "Maternity, Kids & Baby Care",
    titleAr: "الأمومة والطفولة والرضع",
    descriptionEn: "Smart guidance and trusted essentials for your family.",
    descriptionAr: "استشارات ذكية واختيارات موثوقة لأمان عائلتك.",
    link: "/chat?category=kids",
    imageUrl:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80",
    sortOrder: 5,
  },
  {
    titleEn: "Smart Travel & Trips",
    titleAr: "السفر والرحلات الذكية",
    descriptionEn: "Smart travel planning, hotel & flight booking, transfers, and trip essentials.",
    descriptionAr: "تخطيط ذكي للرحلات، حجوزات الفنادق والطيران والتنقلات ومستلزمات السفر.",
    link: "/chat?category=travel",
    imageUrl:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
    sortOrder: 6,
  },
];
