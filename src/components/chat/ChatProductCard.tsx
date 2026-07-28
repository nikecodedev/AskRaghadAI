"use client";

import Image from "next/image";
import type { ChatProduct } from "@/lib/products/types";
import { useApp } from "@/components/providers/AppProviders";
import { CopyCodeButton } from "@/components/chat/CopyCodeButton";

/**
 * Affiliate product card for chat.
 * Client requirement: show a real product PHOTO that is clickable and opens
 * the affiliate link (not a brand-logo placeholder).
 */
export function ChatProductCard({
  product,
  hideDescription = false,
}: {
  product: ChatProduct;
  /**
   * Set when the card is rendered inline, directly under the assistant's own
   * write-up of that partner. The reply already describes the store there, so
   * repeating the description on the card printed the same sentence twice.
   * The standalone grid keeps it, since nothing else describes the store.
   */
  hideDescription?: boolean;
}) {
  const { messages } = useApp();
  const href = product.affiliateUrl;
  const imageSrc = product.imageUrl || "/brand/mark.png";
  const hasProductPhoto = Boolean(product.imageUrl);
  const actionLabel = product.category === "travel" ? messages.products.bookNow : messages.products.shopNow;

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
        // Decorative hover hint only — the real button sits below. Marked
        // aria-hidden so screen readers don't announce "Buy now" twice, and
        // so copying the conversation doesn't pick up an invisible label.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 select-none bg-gradient-to-t from-black/45 to-transparent px-3 pb-2.5 pt-8 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
        >
          {actionLabel}
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
          aria-label={`${actionLabel}: ${product.name}`}
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

        {product.description && !hideDescription && (
          <p className="luxury-muted mt-1.5 line-clamp-2 text-sm leading-6">{product.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {product.price != null && (
            <span className="text-sm font-medium text-[#2c6e55]">
              {product.price} {product.currency}
            </span>
          )}
          {product.discountCode && <CopyCodeButton code={product.discountCode} />}
        </div>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {actionLabel}
          </a>
        ) : null}
      </div>
    </article>
  );
}
