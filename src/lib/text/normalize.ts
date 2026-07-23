/** Normalize smart punctuation from LLM output for reliable display. */
export function normalizeAnswerText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u2032\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\uFFFD+/g, "'");
}

const RLM = "\u200F";

/** Keep Arabic punctuation from jumping to the wrong side of RTL lines. */
export function fixRtlPunctuation(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      let fixed = line.replace(/^(\s*)([:：\-–—•])\s*/, `$1${RLM}$2 `);
      fixed = fixed.replace(/^(\s*)([([])/, `$1${RLM}$2`);
      return fixed;
    })
    .join("\n");
}

/**
 * Soften accidental feminine Arabic address from the model.
 *
 * Note: JS `\b` is ASCII-only and does NOT work as a word boundary for Arabic
 * letters — never use `\b` around Arabic conjugations.
 */
export function neutralizeArabicGender(text: string): string {
  return text
    .replace(/تفضلينه/g, "تفضّله")
    .replace(/هل تريدين/g, "هل تريد")
    .replace(/هل تفضلين/g, "هل تفضّل")
    .replace(/يمكنكِ/g, "يمكنك")
    .replace(/عليكِ/g, "عليك")
    .replace(/لكِ/g, "لك")
    .replace(/سؤالكِ/g, "سؤالك")
    .replace(/اختياركِ/g, "اختيارك")
    .replace(/تأكدي/g, "تأكد")
    .replace(/احجزي/g, "احجز")
    .replace(/اخترِي/g, "اختر")
    .replace(/اختاري/g, "اختر")
    .replace(/جرّبي/g, "جرّب")
    .replace(/جربي/g, "جرب")
    .replace(/اذهبي/g, "اذهب")
    .replace(/شاهدي/g, "شاهد")
    .replace(/افتحي/g, "افتح")
    .replace(/حاولي/g, "حاول")
    .replace(/انظري/g, "انظر")
    .replace(/اضغطي/g, "اضغط")
    .replace(/تصفحي/g, "تصفح")
    .replace(/أضيفي/g, "أضف")
    .replace(/اضيفي/g, "اضف")
    .replace(/ابدئي/g, "ابدأ")
    .replace(/ابدأي/g, "ابدأ")
    .replace(/فضّلي/g, "فضّل")
    .replace(/فضلي/g, "فضل")
    .replace(/تفضلين/g, "تفضّل")
    .replace(/تريدين/g, "تريد")
    .replace(/تستطيعين/g, "تستطيع")
    .replace(/تحتاجين/g, "تحتاج")
    .replace(/ستحبين/g, "ستحب")
    .replace(/ستجدين/g, "ستجد")
    .replace(/يجب عليكِ/g, "يجب عليك");
}

export function prepareChatDisplayText(text: string, locale: "en" | "ar"): string {
  let normalized = normalizeAnswerText(text);
  if (locale === "ar" || /[\u0600-\u06FF]/.test(normalized)) {
    normalized = neutralizeArabicGender(normalized);
    normalized = fixRtlPunctuation(normalized);
  }
  return normalized;
}
