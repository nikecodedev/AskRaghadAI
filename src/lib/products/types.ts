import type { Product } from "@prisma/client";

export type ChatProduct = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  currency: string;
  affiliateUrl?: string;
  discountCode?: string;
  category: string;
};

export function toChatProduct(product: Product, locale: "en" | "ar"): ChatProduct {
  return {
    id: product.id,
    name: locale === "ar" ? product.nameAr : product.nameEn,
    description: locale === "ar" ? product.descriptionAr ?? undefined : product.descriptionEn ?? undefined,
    imageUrl: product.imageUrl ?? undefined,
    price: product.price ?? undefined,
    currency: product.currency,
    affiliateUrl: product.affiliateUrl ?? undefined,
    discountCode: product.discountCode ?? undefined,
    category: product.category,
  };
}
