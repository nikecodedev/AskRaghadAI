"use client";

import Image from "next/image";
import { useState } from "react";
import type { ChatProduct } from "@/lib/products/types";
import { useApp } from "@/components/providers/AppProviders";
import { CopyCodeButton } from "@/components/chat/CopyCodeButton";

/**
 * A dynamically assembled set (outfit, trip, etc.) — every item shares the
 * same Bundle_ID from the Sheet. Each item keeps its own individual "Buy
 * Now" link regardless of selection state (client requirement: a la carte
 * buying freedom, never forced into the whole package), the checkbox only
 * controls what counts toward the live total below.
 */
export function BundleCard({ products }: { products: ChatProduct[] }) {
  const { messages } = useApp();
  const [selected, setSelected] = useState(() => new Set(products.map((p) => p.id)));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalsByCurrency = products.reduce<Record<string, number>>((acc, p) => {
    if (!selected.has(p.id) || p.price == null) return acc;
    acc[p.currency] = (acc[p.currency] ?? 0) + p.price;
    return acc;
  }, {});
  const totalEntries = Object.entries(totalsByCurrency);

  return (
    <div className="chat-bubble-assistant mt-3 overflow-hidden rounded-2xl border border-[#c9a962]/40 bg-white shadow-sm">
      <div className="border-b border-[#ddd0b8]/50 bg-[#faf6ef] px-4 py-2.5">
        <p className="text-sm font-semibold text-[#1f5240]">{messages.products.bundleTitle}</p>
        <p className="text-xs text-[#7a8b82]">{messages.products.bundleHint}</p>
      </div>

      <ul className="divide-y divide-[#ddd0b8]/40">
        {products.map((p) => {
          const isChecked = selected.has(p.id);
          const isMain = p.itemRole !== "complementary";
          return (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(p.id)}
                aria-label={`${messages.products.includeInTotal}: ${p.name}`}
                className="h-4 w-4 shrink-0 accent-[#2c6e55]"
              />

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f3ece0]">
                <Image
                  src={p.imageUrl || "/brand/mark.png"}
                  alt={p.name}
                  fill
                  unoptimized={Boolean(p.imageUrl)}
                  className={p.imageUrl ? "object-cover" : "object-contain p-2"}
                  sizes="56px"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-[#24332c]">{p.name}</p>
                  {!isMain && (
                    <span className="shrink-0 rounded-full bg-[#f3ece0] px-1.5 py-0.5 text-[10px] font-medium text-[#7a8b82]">
                      {messages.products.optional}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {p.price != null && (
                    <span className="text-xs font-medium text-[#2c6e55]">
                      {p.price} {p.currency}
                    </span>
                  )}
                  {p.discountCode && <CopyCodeButton code={p.discountCode} />}
                </div>
              </div>

              {p.affiliateUrl && (
                <a
                  href={p.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  {messages.products.shopNow}
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-[#ddd0b8]/50 bg-[#faf6ef] px-4 py-3">
        <span className="text-sm font-medium text-[#3d4f45]">{messages.products.bundleTotal}</span>
        <span className="text-sm font-semibold text-[#1f5240]">
          {totalEntries.length > 0
            ? totalEntries.map(([currency, sum]) => `${sum} ${currency}`).join(" + ")
            : messages.products.bundleTotalEmpty}
        </span>
      </div>
    </div>
  );
}
