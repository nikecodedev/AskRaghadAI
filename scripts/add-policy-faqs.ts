import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { buildFaqContent } from "../src/lib/faq/parse";
import { indexPendingKnowledgeChunks } from "../src/lib/rag/index-service";

/**
 * Adds the client-supplied shipping, returns and sizing FAQs.
 *
 * These three questions were the knowledge base's biggest gap: the assistant
 * had no entries for them at all, so it either declined or improvised. The
 * wording is the client's own and deliberately unedited — it states that this
 * is an affiliate platform and that fulfilment, returns and sizing all belong
 * to the merchant, which is a legal position rather than a copy decision.
 *
 * Creates the same shape the admin panel's POST creates (KnowledgeDocument +
 * one DocumentChunk, category "faq") so these entries are editable in the
 * panel afterwards, then embeds them — an unembedded chunk is filtered out of
 * retrieval and would be invisible to the assistant.
 *
 * Re-running is safe: entries are matched on title and updated in place
 * rather than duplicated.
 */

const FAQS = [
  {
    title: "Shipping",
    questionEn: "Do you handle shipping?",
    questionAr: "هل تقومون بالشحن؟",
    answerEn:
      "We are an affiliate platform and do not handle shipping directly. All orders are shipped and fulfilled by the original merchant store. You can check shipping details on the merchant's page.",
    answerAr:
      "نحن موقع تسويق بالعمولة (Affiliate)، ولا نقوم بالشحن بأنفسنا. يتم شحن وتوصيل الطلبات مباشرة من قِبل المتجر الأصلي الذي تشتري منه. يمكنك معرفة تفاصيل الشحن والدول عند الانتقال لصفحة المتجر.",
  },
  {
    title: "Returns & Exchanges",
    questionEn: "What is your returns and exchanges policy?",
    questionAr: "ما هي سياسة الإرجاع والاستبدال؟",
    answerEn:
      "Return and exchange policies are subject to the terms of the specific merchant you buy from. Please review their policy before purchasing.",
    answerAr:
      "تخضع سياسات الإرجاع والاستبدال لشروط وضوابط المتجر الأصلي الذي أتممت الشراء من خلاله. يُرجى مراجعة سياستهم قبل إتمام الطلب.",
  },
  {
    title: "Sizing",
    questionEn: "How do I choose the right size?",
    questionAr: "كيف أختار المقاس المناسب؟",
    answerEn:
      "Sizing charts vary by store. We recommend checking the Size Guide on the original merchant's website before buying.",
    answerAr:
      "تختلف جداول المقاسات باختلاف كل متجر وعلامة تجارية. ننصح بالاطلاع على دليل المقاسات (Size Guide) المتوفر في المتجر الأصلي قبل الشراء.",
  },
];

async function main() {
  for (const faq of FAQS) {
    const content = buildFaqContent(faq.questionEn, faq.questionAr, faq.answerEn, faq.answerAr);

    const existing = await prisma.knowledgeDocument.findFirst({
      where: { category: "faq", title: faq.title },
      include: { chunks: true },
    });

    if (existing) {
      // Replace the chunks so a re-run refreshes wording without duplicating
      // the entry or leaving a stale embedding behind.
      await prisma.documentChunk.deleteMany({ where: { documentId: existing.id } });
      await prisma.documentChunk.create({
        data: { documentId: existing.id, content, chunkIndex: 0 },
      });
      console.log(`  updated: ${faq.title}`);
      continue;
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        title: faq.title,
        filename: `faq-${Date.now()}-${faq.title.toLowerCase().replace(/[^a-z]+/g, "")}.txt`,
        category: "faq",
        region: "ksa",
        status: "pending",
      },
    });
    await prisma.documentChunk.create({
      data: { documentId: doc.id, content, chunkIndex: 0 },
    });
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "uploaded" },
    });
    console.log(`  created: ${faq.title}`);
  }

  const result = await indexPendingKnowledgeChunks();
  console.log(`\nEmbedded ${result.embedded} chunk(s).`);

  const total = await prisma.documentChunk.count({ where: { NOT: { embedding: null } } });
  console.log(`Total embedded chunks now: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
