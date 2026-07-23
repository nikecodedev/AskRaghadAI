import { tokenizeForSearch } from "./dialect";

export type ScoredChunk<T> = {
  item: T;
  score: number;
  denseScore?: number;
  sparseScore?: number;
};

/**
 * BM25-inspired sparse scoring for exact term / dialect matching.
 */
export function keywordScore(query: string, document: string): number {
  const queryTokens = tokenizeForSearch(query);
  const docTokens = tokenizeForSearch(document);
  if (!queryTokens.length || !docTokens.length) return 0;

  const docFreq = new Map<string, number>();
  for (const token of docTokens) {
    docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
  }

  let score = 0;
  for (const token of queryTokens) {
    const freq = docFreq.get(token) ?? 0;
    if (freq > 0) {
      score += 1 + Math.log(1 + freq);
    }
  }

  return score / queryTokens.length;
}

export function hybridMerge<T extends { content: string }>(
  items: T[],
  query: string,
  denseScores: Map<string, number>,
  opts: { denseWeight?: number; sparseWeight?: number; topK?: number } = {}
): ScoredChunk<T>[] {
  const { denseWeight = 0.6, sparseWeight = 0.4, topK = 5 } = opts;

  const scored: ScoredChunk<T>[] = items.map((item) => {
    const id = "id" in item ? String((item as { id: string }).id) : item.content.slice(0, 32);
    const dense = denseScores.get(id) ?? 0;
    const sparse = keywordScore(query, item.content);
    const score = dense * denseWeight + sparse * sparseWeight;
    return { item, score, denseScore: dense, sparseScore: sparse };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Cosine similarity between two embedding vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
