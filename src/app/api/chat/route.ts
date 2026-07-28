import { NextResponse } from "next/server";
import { expandQueryForRetrieval } from "@/lib/rag/dialect";
import { getActiveIndexedChunks } from "@/lib/rag/store";
import {
  detectImageSearchTerms,
  generateAnswerWithTools,
  isOpenAIConfigured,
  retrieveChunks,
} from "@/lib/rag/openai-rag";
import type { IndexedChunk, ToolProductMatch } from "@/lib/rag/openai-rag";
import { findProductsForItem, getProductsForChat } from "@/lib/products/store";
import { getBundledProductsForChat } from "@/lib/products/fallback-catalog";
import { toChatProduct } from "@/lib/products/types";
import type { ChatProduct } from "@/lib/products/types";
import {
  getCategoryFallbackMessage,
  stripRawUrls,
} from "@/lib/chat/fallback";
import { prepareChatDisplayText } from "@/lib/text/normalize";
import { getSession } from "@/lib/auth/session";
import { persistChatExchange } from "@/lib/chat/persist";

export const maxDuration = 60;

// A real question is never this long. Without a cap the whole body is
// forwarded to OpenAI and re-sent on every tool-calling round, so a single
// oversized request could burn a large amount of credit (an 80,000-character
// query was accepted before this limit existed).
const MAX_QUERY_CHARS = 2000;
// Images are billed by size on vision calls; refuse anything beyond a normal
// phone photo rather than paying for it.
const MAX_IMAGE_CHARS = 1_500_000; // ~1MB after base64 encoding

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query ?? "").trim().slice(0, MAX_QUERY_CHARS);
    const locale = body.locale === "ar" ? "ar" : "en";
    const category = body.category ? String(body.category) : undefined;
    const rawImage = typeof body.image === "string" && body.image.startsWith("data:image")
      ? body.image
      : undefined;
    const image = rawImage && rawImage.length <= MAX_IMAGE_CHARS ? rawImage : undefined;
    type HistoryTurn = { role: "user" | "assistant"; content: string };
    const rawHistory: unknown[] = Array.isArray(body.history) ? body.history : [];
    const history: HistoryTurn[] = rawHistory
      .filter((m): m is { role: string; content: string } =>
        Boolean(m) && typeof m === "object" && "role" in (m as object) && "content" in (m as object),
      )
      .map((m): HistoryTurn => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content ?? "").slice(0, 4000),
      }))
      .filter((m: HistoryTurn) => m.content.trim().length > 0)
      .slice(-10);

    if (!query && !image) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Without an API key we cannot generate answers — guide to categories.
    if (!isOpenAIConfigured()) {
      return NextResponse.json({
        answer: getCategoryFallbackMessage(locale),
        suggestCategories: true,
        stub: true,
      });
    }

    // When an image is attached, describe it first so the description can
    // actually drive RAG/product matching below — previously the image only
    // reached the final answer call, so uploading a photo with no typed
    // caption matched against an empty query.
    let searchQuery = query;
    if (image) {
      const detected = await detectImageSearchTerms(image, locale);
      if (detected) {
        searchQuery = query ? `${query} ${detected}` : detected;
      }
    }

    const chunks = await getActiveIndexedChunks().catch((ragError) => {
      console.error("[chat] rag load", ragError);
      return [] as IndexedChunk[];
    });

    let retrieved: IndexedChunk[] = [];
    if (chunks.length > 0) {
      try {
        const expanded = expandQueryForRetrieval(searchQuery || "");
        retrieved = await retrieveChunks(chunks, searchQuery || "", expanded);
      } catch (ragError) {
        console.error("[chat] rag retrieve", ragError);
      }
    }

    // The AI decides for itself which specific products to surface by
    // calling find_products for each item it actually recommends, right as
    // it writes about it — this map collects the full product rows behind
    // each id the tool returns, so we can build real ChatProduct cards for
    // exactly (and only) what the reply ends up referencing inline.
    const fullProductRows = new Map<string, ChatProduct>();
    const lookupProducts = async (item: string): Promise<ToolProductMatch[]> => {
      // resolveProductCategory prioritises the item's own words over the
      // page category, so an aside like "hotel in London" on the Fashion
      // page still resolves to travel instead of being force-matched.
      const matches = await findProductsForItem(item, category, 3).catch((error) => {
        console.error("[chat] product tool lookup", error);
        return [];
      });
      matches.forEach((m) => fullProductRows.set(m.id, toChatProduct(m, locale)));
      return matches.map((m) => ({ id: m.id, nameEn: m.nameEn, nameAr: m.nameAr }));
    };

    let rawAnswer: string;
    let usedProductIds: string[];
    try {
      const result = await generateAnswerWithTools(
        query,
        retrieved,
        locale,
        category,
        lookupProducts,
        image,
        history,
      );
      rawAnswer = result.text;
      usedProductIds = result.usedProductIds;
    } catch (aiError) {
      console.error("[chat] generate", aiError);
      return NextResponse.json({
        answer: getCategoryFallbackMessage(locale),
        suggestCategories: true,
        stub: true,
        errorCode: "ai_unavailable",
      });
    }

    if (!rawAnswer?.trim()) {
      return NextResponse.json({
        answer: getCategoryFallbackMessage(locale),
        suggestCategories: true,
        stub: true,
        errorCode: "empty_answer",
      });
    }

    // The AI appends this sentinel (never shown to the user) when it asked a
    // clarifying question instead of recommending — without checking for it,
    // the fallback below would guess a generic product grid for a reply that
    // deliberately isn't recommending anything yet, reintroducing the exact
    // "random unrelated cards" complaint this whole system was built to fix.
    const deferredProducts = /\[\[no-cards\]\]/.test(rawAnswer);
    const cleanedAnswer = rawAnswer.replace(/\s*\[\[no-cards\]\]\s*/g, "\n").trim();

    // Strip raw URLs, then neutralize feminine Arabic + fix RTL punctuation
    // so the chat UI never shows تأكدي/احجزي or leading-colon jumps.
    const answer = prepareChatDisplayText(stripRawUrls(cleanedAnswer, locale), locale);

    const session = await getSession();
    if (session && query) {
      try {
        await persistChatExchange(session.userId, query, answer);
      } catch (persistError) {
        console.error("[chat] persist", persistError);
      }
    }

    let products = usedProductIds.map((id) => fullProductRows.get(id)).filter((p): p is ChatProduct => Boolean(p));
    let fallbackGrid = false;
    let isBundle = false;

    // The model itself found real products via find_products, but sometimes
    // forgets to place any [[card:ID]] / [[bundle:...]] placeholder in its
    // final text at all — usedProductIds is non-empty, but nothing in the
    // reply actually references them, so zero cards would render. Show what
    // was genuinely found as a plain grid rather than silently losing it —
    // this is real, intent-matched data, not a guess, so it still respects
    // "never show unrelated cards".
    const hasInlineMarker = /\[\[(card|bundle):/.test(answer);
    if (products.length > 0 && !hasInlineMarker) {
      fallbackGrid = true;
    }

    // The model made zero find_products calls (or none matched) — fall back
    // to intent-based search so a genuine shopping question never ends up
    // with no cards at all, same as a query with no inline references. Skip
    // this entirely when the model deliberately asked a clarifying question
    // instead of recommending — showing a guessed grid there would be exactly
    // the "random unrelated cards" behavior this system replaces.
    if (products.length === 0 && !deferredProducts) {
      const fallback = await getProductsForChat({ query: searchQuery, category, locale }).catch((error) => {
        console.error("[chat] fallback products", error);
        return { products: [], isBundle: false };
      });
      let fallbackRows = fallback.products;
      isBundle = fallback.isBundle;
      if (fallbackRows.length === 0) {
        fallbackRows = getBundledProductsForChat({ query: searchQuery, category });
        isBundle = false;
      }
      if (fallbackRows.length > 0) {
        products = fallbackRows.map((p) => toChatProduct(p, locale));
        fallbackGrid = true;
      }
    }

    return NextResponse.json({
      answer,
      products,
      fallbackGrid,
      isBundle,
      suggestCategories: false,
      sources: retrieved.map((c) => ({
        id: c.id,
        source: c.metadata.source,
        category: c.metadata.category,
        preview: c.content.slice(0, 120),
      })),
    });
  } catch (error) {
    console.error("[chat]", error);
    return NextResponse.json({ error: "Chat request failed" }, { status: 500 });
  }
}
