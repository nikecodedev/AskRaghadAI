/** Common Saudi / Gulf / Egyptian dialect terms mapped to formal Arabic equivalents */
export const DIALECT_SYNONYMS: Record<string, string[]> = {
  "ما": ["وش", "إيش", "ايش", "شنو", "إيه"],
  "جيد": ["زين", "تمام", "كويس", "حلو"],
  "كيف": ["كيفك", "شلون", "ازاي"],
  "لماذا": ["ليش", "ليه"],
  "الآن": [" الحين", "دحين", "دلوقتي"],
  "اريد": ["ابغى", "أبغى", "عايز", "أبي"],
  "هذا": ["ذا", "هذا", "ده", "هاد"],
  "خدمة": ["خدمة", "سيرفس"],
  "استشارة": ["استشارة", "consultation"],
};

export function enrichChunkWithSynonyms(content: string): string[] {
  const found: string[] = [];
  for (const [formal, dialects] of Object.entries(DIALECT_SYNONYMS)) {
    if (content.includes(formal) || dialects.some((d) => content.includes(d.trim()))) {
      found.push(formal, ...dialects.map((d) => d.trim()));
    }
  }
  return [...new Set(found)];
}

/**
 * Expand a user query with formal Arabic equivalents for hybrid keyword search.
 */
export function expandQueryForRetrieval(query: string): string {
  let expanded = query;
  for (const [formal, dialects] of Object.entries(DIALECT_SYNONYMS)) {
    for (const term of dialects) {
      if (query.includes(term.trim())) {
        expanded += ` ${formal}`;
      }
    }
  }
  return expanded;
}

export function tokenizeForSearch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
