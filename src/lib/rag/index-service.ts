import { loadSampleKnowledgeBase } from "@/lib/rag/sample-loader";
import { saveIndexedChunksToDb } from "@/lib/rag/db-store";
import { setIndexedChunks } from "@/lib/rag/memory-store";
import { indexChunks, isOpenAIConfigured } from "@/lib/rag/openai-rag";

export async function indexSampleKnowledgeBase() {
  if (!isOpenAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const chunks = loadSampleKnowledgeBase();
  const indexed = await indexChunks(chunks);
  await saveIndexedChunksToDb(indexed, {
    filename: "sample-knowledge-base",
    region: "ksa",
    category: "general",
  });
  setIndexedChunks(indexed);
  return { chunkCount: indexed.length };
}
