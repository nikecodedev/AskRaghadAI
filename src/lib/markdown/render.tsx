import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[2]) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-bold text-[#1f5240]">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {match[3]}
        </em>,
      );
    }
    last = match.index + match[0].length;
    i++;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function MarkdownContent({
  content,
  dir = "ltr",
}: {
  content: string;
  dir?: "ltr" | "rtl";
}) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let blockKey = 0;

  let orderedItems: ReactNode[][] = [];

  const flushBulletList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blockKey++}`} className="my-2 list-disc space-y-1.5 ps-5">
        {listItems}
      </ul>,
    );
    listItems = [];
  };

  const flushOrderedList = () => {
    if (orderedItems.length === 0) return;
    blocks.push(
      <ol key={`olist-${blockKey++}`} className="my-2 list-decimal space-y-1.5 ps-5">
        {orderedItems.map((itemContent, idx) => (
          <li key={`oli-${idx}`}>{itemContent}</li>
        ))}
      </ol>,
    );
    orderedItems = [];
  };

  const flushLists = () => {
    flushBulletList();
    flushOrderedList();
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = /^(#{1,3})\s+(.+)/.exec(trimmed);
    const bullet = /^[-*•]\s+(.+)/.exec(trimmed);
    const numbered = /^\d+\.\s+(.+)/.exec(trimmed);

    if (bullet) {
      // A bullet line immediately following a numbered item (no blank line/heading
      // in between) is that item's description, not a new standalone list —
      // otherwise flushing here would reset the ordered list and every step
      // would render as "1." instead of continuing 1, 2, 3...
      if (orderedItems.length > 0 && listItems.length === 0) {
        const lastIndex = orderedItems.length - 1;
        orderedItems[lastIndex] = [
          ...orderedItems[lastIndex],
          <span key={`oli-${lastIndex}-${orderedItems[lastIndex].length}`} className="mt-0.5 block text-[0.925em] text-[#5c6b62]">
            {renderInline(bullet[1], `oli-${lastIndex}-${orderedItems[lastIndex].length}`)}
          </span>,
        ];
        continue;
      }
      flushOrderedList();
      listItems.push(
        <li key={`li-${listItems.length}`}>{renderInline(bullet[1], `li-${listItems.length}`)}</li>,
      );
      continue;
    }

    if (numbered) {
      flushBulletList();
      orderedItems.push([
        <span key={`oli-${orderedItems.length}-0`}>
          {renderInline(numbered[1], `oli-${orderedItems.length}`)}
        </span>,
      ]);
      continue;
    }

    if (!trimmed) {
      // A blank line between a numbered item and the next one is normal loose-list
      // spacing from the AI's output — don't let it break the running count.
      if (orderedItems.length > 0 || listItems.length > 0) {
        continue;
      }
      blocks.push(<div key={`sp-${blockKey++}`} className="h-2.5" />);
      continue;
    }

    flushLists();

    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const cls =
        level === 1
          ? "mt-3 mb-1.5 text-lg font-semibold text-[#1f5240]"
          : level === 2
            ? "mt-2.5 mb-1 text-base font-semibold text-[#1f5240]"
            : "mt-2 mb-1 text-[0.95rem] font-semibold text-[#24332c]";
      blocks.push(
        <p key={`h-${blockKey++}`} className={cls}>
          {renderInline(text, `h-${blockKey}`)}
        </p>,
      );
      continue;
    }

    blocks.push(
      <p key={`p-${blockKey++}`} className="my-1.5 leading-relaxed">
        {renderInline(trimmed, `p-${blockKey}`)}
      </p>,
    );
  }

  flushLists();
  return (
    <div dir={dir} className="chat-message-body space-y-0.5">
      {blocks}
    </div>
  );
}
