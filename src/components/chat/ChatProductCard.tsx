"use client";

import Image from "next/image";
import type { ChatProduct } from "@/lib/products/types";
import { useApp } from "@/components/providers/AppProviders";

/**
 * Affiliate product card for chat.
 * Client requirement: show a real product PHOTO that is clickable and opens
 * the affiliate link (not a brand-logo placeholder).
 */
export function ChatProductCard({ product }: { product: ChatProduct }) {
  const { messages } = useApp();
  const href = product.affiliateUrl;
  const imageSrc = product.imageUrl || "/brand/mark.png";
  const hasProductPhoto = Boolean(product.imageUrl);

  const imageBlock = (
    <div className="relative h-44 w-full bg-[#f3ece0]">
      <Image
        src={imageSrc}
        alt={product.name}
        fill
        className={hasProductPhoto ? "object-cover transition group-hover:scale-[1.03]" : "object-contain p-6"}
        unoptimized={hasProductPhoto}
        sizes="(max-width: 640px) 50vw, 240px"
      />
      {href ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 pb-2.5 pt-8 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
          {messages.products.shopNow}
        </span>
      ) : null}
    </div>
  );

  return (
    <article className="group overflow-hidden rounded-xl border border-[#ddd0b8]/60 bg-white shadow-sm transition hover:border-[#c9a962]/50 hover:shadow-md">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${messages.products.shopNow}: ${product.name}`}
          className="block"
        >
          {imageBlock}
        </a>
      ) : (
        imageBlock
      )}

      <div className="p-4">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-base font-semibold text-[#24332c] transition hover:text-[#2c6e55]"
          >
            {product.name}
          </a>
        ) : (
          <h3 className="text-base font-semibold text-[#24332c]">{product.name}</h3>
        )}

        {product.description && (
          <p className="luxury-muted mt-1.5 line-clamp-2 text-sm leading-6">{product.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {product.price != null && (
            <span className="text-sm font-medium text-[#2c6e55]">
              {product.price} {product.currency}
            </span>
          )}
          {product.discountCode && (
            <span className="rounded-full bg-[#c9a962]/20 px-2 py-0.5 text-xs text-[#9a8560]">
              {product.discountCode}
            </span>
          )}
        </div>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {messages.products.shopNow}
          </a>
        ) : null}
      </div>
    </article>
  );
}
