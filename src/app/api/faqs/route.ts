import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseFaqContent } from "@/lib/faq/parse";

// Public — powers the site's FAQ section so admin-managed FAQs actually show up live,
// instead of the previously hardcoded list in the translation files.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";

  // Degrade to an empty list rather than 500 if the database is briefly
  // unavailable — the homepage falls back to its built-in FAQ copy, matching
  // how /api/settings and /api/category-cards already behave.
  const docs = await prisma.knowledgeDocument
    .findMany({
      where: { category: "faq" },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
      orderBy: { createdAt: "asc" },
    })
    .catch((error) => {
      console.error("[faqs]", error);
      return [];
    });

  const items = docs
    .map((doc) => {
      const content = doc.chunks.map((c) => c.content).join("\n\n");
      const parsed = parseFaqContent(content);
      const answer = locale === "ar" ? parsed.answerAr || parsed.answerEn : parsed.answerEn || parsed.answerAr;
      const question =
        (locale === "ar" ? parsed.questionAr || parsed.questionEn : parsed.questionEn || parsed.questionAr) ||
        doc.title;
      if (!answer) return null;
      return { q: question, a: answer };
    })
    .filter((item): item is { q: string; a: string } => item !== null);

  return NextResponse.json({ items });
}
