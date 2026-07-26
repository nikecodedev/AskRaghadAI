export function parseFaqContent(content: string) {
  const qEnMatch = /^Q \(English\):\s*(.*)$/m.exec(content);
  const qArMatch = /^Q \(Arabic\):\s*(.*)$/m.exec(content);
  const legacyQMatch = /^Q:\s*(.*)$/m.exec(content);
  const enMatch = /^A \(English\):\s*(.*)$/m.exec(content);
  const arMatch = /^A \(Arabic\):\s*(.*)$/m.exec(content);
  return {
    // Falls back to the old single "Q:" line for FAQs saved before bilingual
    // questions were split out, so existing entries keep working.
    questionEn: qEnMatch?.[1] ?? legacyQMatch?.[1] ?? "",
    questionAr: qArMatch?.[1] ?? "",
    answerEn: enMatch?.[1] ?? "",
    answerAr: arMatch?.[1] ?? "",
  };
}

export function buildFaqContent(
  questionEn: string,
  questionAr: string,
  answerEn: string,
  answerAr: string,
) {
  return [
    `Q (English): ${questionEn}`,
    questionAr ? `Q (Arabic): ${questionAr}` : null,
    answerEn ? `A (English): ${answerEn}` : null,
    answerAr ? `A (Arabic): ${answerAr}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
