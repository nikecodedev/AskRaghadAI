import { CATEGORIES } from "@/lib/categories";
import { prepareChatDisplayText } from "@/lib/text/normalize";
import type { Locale } from "@/lib/i18n/types";

export function getCategoryFallbackMessage(locale: "en" | "ar"): string {
  const list = CATEGORIES.map((c, i) => {
    const name = locale === "ar" ? c.nameAr : c.nameEn;
    return locale === "ar" ? `${i + 1}. ${name}` : `${i + 1}. ${name}`;
  }).join("\n");

  if (locale === "ar") {
    return `شكراً لسؤالك — يسعدني مساعدتك.\n\nلم أجد تفاصيل كافية عن هذا الطلب في قاعدة معرفتنا حالياً، لكن يمكنني تقديم توصيات موثوقة ضمن الأقسام التالية:\n\n${list}\n\nاختر القسم الأنسب من الصفحة الرئيسية، أو اكتب سؤالك ضمن أحد هذه المجالات وسأقدّم لك أفضل الخيارات بعناية.`;
  }

  return `Thank you for your question — I'm happy to help.\n\nI don't have enough detail on that topic in our knowledge base yet, but I can offer trusted recommendations across these categories:\n\n${list}\n\nBrowse the most relevant section from our homepage, or ask your question within one of these areas and I'll guide you to the best options.`;
}

const FALLBACK_PATTERNS = [
  /لا أملك معلومات/i,
  /لا تجدي الإجابة/i,
  /not in the context/i,
  /don't have enough/i,
  /do not have enough/i,
  /لا توجد بيانات/i,
  /غير متصل/i,
  /not connected/i,
  /not indexed/i,
  /الأقسام التالية/i,
  /these categories/i,
  /لم أجد تفاصيل/i,
  /don't have enough detail/i,
  /يسعدني مساعدتك/i,
  /يسعدني مساعدتكِ/i,
  /happy to help/i,
  /اختر القسم/i,
  /اخترِي القسم/i,
  /browse the most relevant/i,
];

export function shouldSuggestCategories(answer: string): boolean {
  return FALLBACK_PATTERNS.some((p) => p.test(answer));
}

export function stripRawUrls(text: string, locale: Locale = "en"): string {
  const cleaned = text
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return prepareChatDisplayText(cleaned, locale);
}
