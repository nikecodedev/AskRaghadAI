export function parseFaqContent(content: string) {
  const qMatch = /^Q:\s*(.*)$/m.exec(content);
  const enMatch = /^A \(English\):\s*(.*)$/m.exec(content);
  const arMatch = /^A \(Arabic\):\s*(.*)$/m.exec(content);
  return {
    question: qMatch?.[1] ?? "",
    answerEn: enMatch?.[1] ?? "",
    answerAr: arMatch?.[1] ?? "",
  };
}

export function buildFaqContent(question: string, answerEn: string, answerAr: string) {
  return [
    `Q: ${question}`,
    answerEn ? `A (English): ${answerEn}` : null,
    answerAr ? `A (Arabic): ${answerAr}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
