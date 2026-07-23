"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { MarkdownContent } from "@/lib/markdown/render";

type Segment =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string };

function parseSegments(content: string): Segment[] {
  const combined =
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(combined)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, index) });
    }
    if (match[1] && match[2]) {
      segments.push({ type: "link", label: match[1], href: match[2] });
    } else if (match[3]) {
      const href = match[3];
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

export function ChatMessageContent({
  content,
  linkLabel,
  dir,
}: {
  content: string;
  linkLabel: string;
  dir: "ltr" | "rtl";
}) {
  const segments = parseSegments(content);

  return (
    <div className="chat-message-body space-y-2" dir={dir}>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <MarkdownContent key={i} content={seg.value} dir={dir} />
        ) : (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-0.5 inline-flex items-center rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-3 py-0.5 text-xs font-medium text-white hover:opacity-90"
          >
            {seg.label || linkLabel}
          </a>
        ),
      )}
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
