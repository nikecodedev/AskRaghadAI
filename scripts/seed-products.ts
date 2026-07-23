import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_PRODUCTS = [
  {
    category: "fashion",
    nameEn: "Luxury Abaya Collection",
    nameAr: "مجموعة عبايات فاخرة",
    descriptionEn: "Premium silk abaya with gold embroidery.",
    descriptionAr: "عباية حرير فاخرة بتطريز ذهبي.",
    price: 899,
    currency: "SAR",
    discountCode: "RAGHAD15",
    affiliateUrl: "https://example.com/fashion/abaya",
    imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400",
  },
  {
    category: "beauty",
    nameEn: "Rose Gold Skincare Set",
    nameAr: "طقم عناية بالبشرة روز جولد",
    descriptionEn: "Hydrating serum and cream duo.",
    descriptionAr: "سيروم وكريم مرطب للبشرة.",
    price: 349,
    currency: "SAR",
    discountCode: "GLOW20",
    affiliateUrl: "https://example.com/beauty/skincare",
    imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
  },
  {
    category: "travel",
    nameEn: "Dubai Weekend Escape",
    nameAr: "عطلة نهاية أسبوع في دبي",
    descriptionEn: "5-star hotel package with breakfast.",
    descriptionAr: "باقة فندق 5 نجوم مع إفطار.",
    price: 2499,
    currency: "SAR",
    discountCode: "TRAVEL10",
    affiliateUrl: "https://example.com/travel/dubai",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
  },
];

async function main() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`Skipping seed — ${count} products already exist.`);
    return;
  }

  for (const p of SAMPLE_PRODUCTS) {
    await prisma.product.create({ data: { ...p, active: true } });
  }

  console.log(`Seeded ${SAMPLE_PRODUCTS.length} sample products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
