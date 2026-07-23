import { NextResponse } from "next/server";
import { expandQueryForRetrieval } from "@/lib/rag/dialect";
import { getActiveIndexedChunks } from "@/lib/rag/store";
import {
  generateAnswer,
  generateVisionAnswer,
  isOpenAIConfigured,
  retrieveChunks,
} from "@/lib/rag/openai-rag";
import type { IndexedChunk } from "@/lib/rag/openai-rag";
import { getProductsForChat } from "@/lib/products/store";
import { getBundledProductsForChat } from "@/lib/products/fallback-catalog";
import { toChatProduct } from "@/lib/products/types";
import {
  getCategoryFallbackMessage,
  stripRawUrls,
} from "@/lib/chat/fallback";
import { prepareChatDisplayText } from "@/lib/text/normalize";
import { getSession } from "@/lib/auth/session";
import { persistChatExchange } from "@/lib/chat/persist";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query ?? "").trim();
    const locale = body.locale === "ar" ? "ar" : "en";
    const category = body.category ? String(body.category) : undefined;
    const image = typeof body.image === "string" && body.image.startsWith("data:image")
      ? body.image
      : undefined;

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

    // Load RAG chunks and product matches in parallel (saves ~1–3s vs sequential).
    const [chunks, dbProductsResult] = await Promise.all([
      getActiveIndexedChunks().catch((ragError) => {
        console.error("[chat] rag load", ragError);
        return [] as IndexedChunk[];
      }),
      getProductsForChat({ query, category }).catch((productError) => {
        console.error("[chat] products", productError);
        return [] as Awaited<ReturnType<typeof getProductsForChat>>;
      }),
    ]);

    let retrieved: IndexedChunk[] = [];
    if (chunks.length > 0) {
      try {
        const expanded = expandQueryForRetrieval(query || "");
        retrieved = await retrieveChunks(chunks, query || "", expanded);
      } catch (ragError) {
        console.error("[chat] rag retrieve", ragError);
      }
    }

    let dbProducts = dbProductsResult;
    if (dbProducts.length === 0) {
      dbProducts = getBundledProductsForChat({ query, category });
    }
    const partnerNames = dbProducts.map((p) =>
      locale === "ar" ? p.nameAr : p.nameEn,
    );

    let rawAnswer: string;
    try {
      rawAnswer = image
        ? await generateVisionAnswer(query, image, retrieved, locale, category, partnerNames)
        : await generateAnswer(query, retrieved, locale, category, partnerNames);
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

    // Strip raw URLs, then neutralize feminine Arabic + fix RTL punctuation
    // so the chat UI never shows تأكدي/احجزي or leading-colon jumps.
    const answer = prepareChatDisplayText(stripRawUrls(rawAnswer, locale), locale);

    const session = await getSession();
    if (session && query) {
      try {
        await persistChatExchange(session.userId, query, answer);
      } catch (persistError) {
        console.error("[chat] persist", persistError);
      }
    }

    const products = dbProducts.map((p) => toChatProduct(p, locale));

    return NextResponse.json({
      answer,
      products,
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
