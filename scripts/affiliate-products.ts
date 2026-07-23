/**
 * Client affiliate links — testing phase (Mar 2026).
 * Source: afflicate links.md
 */

export type AffiliateProductSeed = {
  category: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  affiliateUrl: string | null;
  discountCode: string | null;
  network: string;
};

function travel(
  nameEn: string,
  nameAr: string,
  url: string
): AffiliateProductSeed {
  return {
    category: "travel",
    nameEn,
    nameAr,
    descriptionEn: `${nameEn} — book via our partner link.`,
    descriptionAr: `${nameAr} — احجز عبر رابط الشريك.`,
    affiliateUrl: url,
    discountCode: null,
    network: "Travelpayouts",
  };
}

export const AFFILIATE_PRODUCTS: AffiliateProductSeed[] = [
  // Smart Travel
  travel("Booking.com", "بوكينج", "https://booking.tpx.lv/hdCdhPLf"),
  travel("Trip.com", "تريب", "https://trip.tpx.lv/pXi9ICIr"),
  travel("Tiqets", "تيكتس", "https://tiqets.tpx.lv/7AWXuR5B"),
  travel("12go", "12جو", "https://12go.tpx.lv/fUTzeIF7"),
  travel("Kiwi.com", "كيوي", "https://kiwi.tpx.lv/5H8dh5Gg"),
  travel("Airalo eSIM", "إيرالو eSIM", "https://airalo.tpx.lv/r14feZw5"),
  travel("Saily eSIM", "سايلي eSIM", "https://saily.tpx.lv/ZFmp5zgl"),
  travel("Ekta Travel Insurance", "تأمين إكتا للسفر", "https://ektatraveling.tpx.lv/sUPs1ULc"),
  travel("Klook", "كلوك", "https://klook.tpx.lv/yyGrUM1V"),
  travel("KKday", "كي كي داي", "https://kkday.tpx.lv/aQGmdnco"),
  travel("Searadar", "سي رادار", "https://searadar.tpx.lv/Xr1REAzV"),
  travel("GetTransfer", "جيت ترانسفر", "https://gettransfer.tpx.lv/AKrxfTBj"),
  travel("Tripster", "تريبستر", "https://tpx.lv/R10gKTNk"),

  // Fashion
  {
    category: "fashion",
    nameEn: "Namshi",
    nameAr: "نمشي",
    descriptionEn: "Fashion & abayas — use promo code at checkout.",
    descriptionAr: "أزياء وعبايات — استخدم كود الخصم عند الدفع.",
    affiliateUrl: "https://www.namshi.com",
    discountCode: "NM408",
    network: "Admitad",
  },
  {
    category: "fashion",
    nameEn: "VogaCloset",
    nameAr: "فوغا كلوسيت",
    descriptionEn: "Modest fashion — use promo code at checkout.",
    descriptionAr: "أزياء محتشمة — استخدم كود الخصم عند الدفع.",
    affiliateUrl: "https://www.voga-closet.com",
    discountCode: "MIV22",
    network: "Admitad",
  },
  {
    category: "fashion",
    nameEn: "Diesel",
    nameAr: "ديزل",
    descriptionEn: "Premium fashion via Admitad partner.",
    descriptionAr: "أزياء فاخرة عبر شريك أدميتاد.",
    affiliateUrl: "https://bywiola.com/g/idw1vvlz5l0592009f078716e55fa2/",
    discountCode: null,
    network: "Admitad",
  },
  {
    category: "fashion",
    nameEn: "JustFashionNow",
    nameAr: "جست فاشن ناو",
    descriptionEn: "Trendy modest fashion via Admitad.",
    descriptionAr: "أزياء عصرية محتشمة عبر أدميتاد.",
    affiliateUrl: "https://rzekl.com/g/kmcoj56juv0592009f07608cdf386b/",
    discountCode: null,
    network: "Admitad",
  },

  // Beauty
  {
    category: "beauty",
    nameEn: "Nazih",
    nameAr: "نزيه",
    descriptionEn: "Beauty & scents via Admitad partner.",
    descriptionAr: "جمال وعطور عبر شريك أدميتاد.",
    affiliateUrl: "https://wpmsx.com/g/ymc795qmu00592009f076cde95af8d/",
    discountCode: null,
    network: "Admitad",
  },
  {
    category: "beauty",
    nameEn: "Amazon Perfumes",
    nameAr: "أمازون — عطور",
    descriptionEn: "Perfumes & beauty on Amazon.",
    descriptionAr: "عطور وجمال على أمازون.",
    affiliateUrl: "https://link.amazon/B007u4p5K",
    discountCode: null,
    network: "Amazon",
  },

  // Skincare
  {
    category: "skincare",
    nameEn: "Stylevana",
    nameAr: "ستايل فانا",
    descriptionEn: "Asian skincare via Admitad.",
    descriptionAr: "عناية بالبشرة آسيوية عبر أدميتاد.",
    affiliateUrl: "https://grfpr.com/g/zaxgnm7sp30592009f07590a2462b6/",
    discountCode: null,
    network: "Admitad",
  },
  {
    category: "skincare",
    nameEn: "Eyewa",
    nameAr: "إيوا",
    descriptionEn: "Skincare & wellness via Admitad.",
    descriptionAr: "عناية بالبشرة والعافية عبر أدميتاد.",
    affiliateUrl: "https://dorinebeaumont.com/g/5brfq9vg0i0592009f07b7da7466f8/",
    discountCode: null,
    network: "Admitad",
  },

  // Home & Kitchen
  {
    category: "home",
    nameEn: "Jashanmal UAE",
    nameAr: "جاشنمال الإمارات",
    descriptionEn: "Home & kitchen essentials via Admitad.",
    descriptionAr: "مستلزمات المنزل والمطبخ عبر أدميتاد.",
    affiliateUrl: "https://codeaven.com/g/pdanpp6uu20592009f0762651c44e1/",
    discountCode: null,
    network: "Admitad",
  },
  {
    category: "home",
    nameEn: "AliExpress",
    nameAr: "علي إكسبريس",
    descriptionEn: "Home decor & kitchen via Admitad.",
    descriptionAr: "ديكور منزلي ومطبخ عبر أدميتاد.",
    affiliateUrl: "https://rzekf.com/g/1e8d1144940592009f0716525dc3e8/",
    discountCode: null,
    network: "Admitad",
  },

  // Kids (from General — Amazon Toys/Kids)
  {
    category: "kids",
    nameEn: "Amazon Toys",
    nameAr: "أمازون — ألعاب",
    descriptionEn: "Kids toys on Amazon.",
    descriptionAr: "ألعاب أطفال على أمازون.",
    affiliateUrl: "https://link.amazon/B0itvXuP0",
    discountCode: null,
    network: "Amazon",
  },
  {
    category: "kids",
    nameEn: "Amazon Kids",
    nameAr: "أمازون — مستلزمات أطفال",
    descriptionEn: "Kids & baby essentials on Amazon.",
    descriptionAr: "مستلزمات أطفال ورضع على أمازون.",
    affiliateUrl: "https://link.amazon/B03JzMF6A",
    discountCode: null,
    network: "Amazon",
  },
  {
    category: "kids",
    nameEn: "Amazon Gift Ideas",
    nameAr: "أمازون — هدايا",
    descriptionEn: "Gift ideas for kids & family.",
    descriptionAr: "أفكار هدايا للأطفال والعائلة.",
    affiliateUrl: "https://link.amazon/A039zc9EN",
    discountCode: null,
    network: "Amazon",
  },

  // Home (Amazon Home)
  {
    category: "home",
    nameEn: "Amazon Home",
    nameAr: "أمازون — المنزل",
    descriptionEn: "Home decor & kitchen on Amazon.",
    descriptionAr: "ديكور منزلي ومطبخ على أمازون.",
    affiliateUrl: "https://link.amazon/B0esYlcLY",
    discountCode: null,
    network: "Amazon",
  },

  // Fashion (Amazon Fashion)
  {
    category: "fashion",
    nameEn: "Amazon Fashion",
    nameAr: "أمازون — أزياء",
    descriptionEn: "Fashion deals on Amazon.",
    descriptionAr: "عروض أزياء على أمازون.",
    affiliateUrl: "https://link.amazon/B0195Cvav",
    discountCode: null,
    network: "Amazon",
  },

  // General Amazon links
  {
    category: "home",
    nameEn: "Amazon Deals 1",
    nameAr: "أمازون — عروض 1",
    descriptionEn: "Curated Amazon partner deal.",
    descriptionAr: "عرض شريك أمازون مختار.",
    affiliateUrl: "https://amzn.to/3W0kKkX",
    discountCode: null,
    network: "Amazon",
  },
  {
    category: "home",
    nameEn: "Amazon Deals 2",
    nameAr: "أمازون — عروض 2",
    descriptionEn: "Curated Amazon partner deal.",
    descriptionAr: "عرض شريك أمازون مختار.",
    affiliateUrl: "https://amzn.to/3S6Tq2p",
    discountCode: null,
    network: "Amazon",
  },
  {
    category: "home",
    nameEn: "Amazon Deals 3",
    nameAr: "أمازون — عروض 3",
    descriptionEn: "Curated Amazon partner deal.",
    descriptionAr: "عرض شريك أمازون مختار.",
    affiliateUrl: "https://amzn.to/4f1m1cW",
    discountCode: null,
    network: "Amazon",
  },

  // Noon
  {
    category: "home",
    nameEn: "Noon KSA",
    nameAr: "نون السعودية",
    descriptionEn: "Shop home & lifestyle on Noon Saudi.",
    descriptionAr: "تسوق المنزل ونمط الحياة على نون السعودية.",
    affiliateUrl: "https://s.noon.com/_AJeeNuiOgg",
    discountCode: null,
    network: "DCM",
  },
  {
    category: "home",
    nameEn: "Noon UAE",
    nameAr: "نون الإمارات",
    descriptionEn: "Shop home & lifestyle on Noon UAE.",
    descriptionAr: "تسوق المنزل ونمط الحياة على نون الإمارات.",
    affiliateUrl: "https://s.noon.com/1wmBLUl_vSk",
    discountCode: null,
    network: "DCM",
  },
];
