"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/AppProviders";

export type ProductCardItem = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  href: string;
  imageUrl?: string | null;
};

export function ProductCard({ item }: { item: ProductCardItem }) {
  const { locale, messages } = useApp();
  const title = locale === "ar" ? item.titleAr : item.titleEn;
  const description = locale === "ar" ? item.descriptionAr : item.descriptionEn;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#ddd0b8]/60 bg-white/80 shadow-sm backdrop-blur transition hover:shadow-md">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={title}
          className="h-44 w-full object-cover sm:h-48"
          loading="lazy"
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = "none";
            const fallback = el.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.hidden = false;
          }}
        />
      ) : null}
      <div
        hidden={Boolean(item.imageUrl)}
        className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-[#f3ece0] to-[#e7dcc8] sm:h-48"
      >
        <span className="font-serif text-2xl text-[#c9a962]/80">{title.slice(0, 1)}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold text-[#24332c]">{title}</h3>
        <p className="luxury-body mt-3 flex-1">{description}</p>
        <div className="mt-4 flex items-center justify-end">
          <Link
            href={item.href}
            className="rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {messages.cards.explore}
          </Link>
        </div>
      </div>
    </article>
  );
}
