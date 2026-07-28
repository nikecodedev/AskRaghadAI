"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { buildMarkdownBlocks } from "@/lib/markdown/render";
import { ChatProductCard } from "@/components/chat/ChatProductCard";
import { BundleCard } from "@/components/chat/BundleCard";
import type { ChatProduct } from "@/lib/products/types";

type Segment =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "cards"; mode: "card" | "bundle"; ids: string[] };

function parseSegments(content: string): Segment[] {
  const combined =
    /\[\[(card|bundle):([\w-]+(?:\s*,\s*[\w-]+)*)\]\]|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(combined)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, index) });
    }
    if (match[1] && match[2]) {
      const ids = match[2].split(",").map((id) => id.trim()).filter(Boolean);
      segments.push({ type: "cards", mode: match[1] as "card" | "bundle", ids });
    } else if (match[3] && match[4]) {
      segments.push({ type: "link", label: match[3], href: match[4] });
    } else if (match[5]) {
      const href = match[5];
      let label = href;
      try {
        label = new URL(href).hostname.replace(/^www\./, "");
      } catch {
        // keep href as label
      }
      segments.push({ type: "link", label, href });
    }
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: content }];
}

function InlineCards({
  mode,
  ids,
  productMap,
  alreadyShown,
}: {
  mode: "card" | "bundle";
  ids: string[];
  productMap: Map<string, ChatProduct>;
  /** Ids rendered earlier in this message, so a partner is never shown twice. */
  alreadyShown: Set<string>;
}) {
  // The assistant may search more than once for related things ("clutch",
  // then "handbag") and get the same partner back each time, then place a
  // placeholder for both — which rendered the identical card twice in a row.
  const products = ids
    .map((id) => productMap.get(id))
    .filter((p): p is ChatProduct => Boolean(p))
    .filter((p) => {
      if (alreadyShown.has(p.id)) return false;
      alreadyShown.add(p.id);
      return true;
    });
  if (products.length === 0) return null;

  if (mode === "bundle" && products.length > 1) {
    return <BundleCard products={products} />;
  }

  return (
    <div className="my-2 grid gap-3 sm:grid-cols-2">
      {products.map((p) => (
        <ChatProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ChatMessageContent({
  content,
  linkLabel,
  dir,
  products = [],
}: {
  content: string;
  linkLabel: string;
  dir: "ltr" | "rtl";
  products?: ChatProduct[];
}) {
  const segments = parseSegments(content);
  const productMap = new Map(products.map((p) => [p.id, p]));
  // A [[card:ID]] marker splits one logical numbered list into several text
  // segments — each is rendered independently, so this counter is threaded
  // through them to keep "1, 2, 3..." continuous instead of every segment
  // after the first marker restarting its own <ol> at 1.
  let nextOrderedStart = 1;
  const alreadyShown = new Set<string>();

  return (
    <div className="chat-message-body space-y-2" dir={dir}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          const { blocks, nextOrderedStart: after } = buildMarkdownBlocks(seg.value, nextOrderedStart);
          nextOrderedStart = after;
          return (
            <div key={i} dir={dir} className="chat-message-body space-y-0.5">
              {blocks}
            </div>
          );
        }
        if (seg.type === "cards")
          return (
            <InlineCards
              key={i}
              mode={seg.mode}
              ids={seg.ids}
              productMap={productMap}
              alreadyShown={alreadyShown}
            />
          );
        return (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-0.5 inline-flex items-center rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-3 py-0.5 text-xs font-medium text-white hover:opacity-90"
          >
            {seg.label || linkLabel}
          </a>
        );
      })}
    </div>
  );
}

export function CategorySuggestions({
  locale,
  title,
}: {
  locale: "en" | "ar";
  title: string;
}) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs text-[#7a8b82]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/chat?category=${cat.id}`}
            className="rounded-full border border-[#d4c4a0]/60 bg-[#faf6ef] px-3 py-1 text-xs text-[#2c6e55] transition hover:bg-[#c9a962]/15"
          >
            {locale === "ar" ? cat.nameAr : cat.nameEn}
          </Link>
        ))}
      </div>
    </div>
  );
}
