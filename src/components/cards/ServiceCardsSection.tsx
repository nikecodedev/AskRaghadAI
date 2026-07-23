"use client";

import { useEffect, useState } from "react";
import { ProductCard, type ProductCardItem } from "./ProductCard";
import { useApp } from "@/components/providers/AppProviders";
import { DEFAULT_CATEGORY_CARDS } from "@/lib/category-cards/defaults";

function toCardItem(card: {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  link: string;
  imageUrl: string;
}): ProductCardItem {
  return {
    id: card.id,
    titleEn: card.titleEn,
    titleAr: card.titleAr,
    descriptionEn: card.descriptionEn,
    descriptionAr: card.descriptionAr,
    price: 0,
    href: card.link,
    imageUrl: card.imageUrl,
  };
}

const FALLBACK_ITEMS: ProductCardItem[] = DEFAULT_CATEGORY_CARDS.map((c, i) =>
  toCardItem({ id: `fallback-${i}`, ...c }),
);

export function ServiceCardsSection() {
  const { messages, locale, dir } = useApp();
  const [items, setItems] = useState<ProductCardItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    fetch("/api/category-cards")
      .then((r) => r.json())
      .then((data) => {
        const cards = Array.isArray(data.cards) ? data.cards : [];
        if (cards.length > 0) {
          setItems(cards.map(toCardItem));
        }
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return (
    <section
      id="categories"
      dir={dir}
      className={`mx-auto max-w-6xl px-4 pb-8 ${
        locale === "ar" ? "pt-8 sm:pt-10 md:pt-4" : "pt-6 sm:pt-8 md:pt-4"
      }`}
    >
      {/* Client: one subtitle only — no duplicate overline above this block. */}
      <div className="mb-8 text-center sm:mb-10">
        <h2 className="luxury-heading-section text-2xl sm:text-3xl">{messages.cards.title}</h2>
        <p className="luxury-muted mx-auto mt-3 max-w-2xl text-base leading-7 sm:text-[1.05rem]">
          {messages.cards.subtitle}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
