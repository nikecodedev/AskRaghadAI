import { loadSampleKnowledgeBase } from "@/lib/rag/sample-loader";
import { saveIndexedChunksToDb } from "@/lib/rag/db-store";
import { setIndexedChunks } from "@/lib/rag/memory-store";
import { embedTexts, indexChunks, isOpenAIConfigured } from "@/lib/rag/openai-rag";
import { enrichChunkWithSynonyms } from "@/lib/rag/dialect";
import { prisma } from "@/lib/db/prisma";

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

/**
 * Embeds knowledge chunks that are stored in the database but have no
 * embedding yet — i.e. everything an admin adds via the Knowledge Base and
 * FAQ pages.
 *
 * There was previously no equivalent of this at all: uploads were written
 * with `embedding = null`, and the only "reindex" action re-read two static
 * files under sample-data/ and never looked at the database. Because
 * retrieval filters on `embedding IS NOT NULL`, every uploaded document and
 * every FAQ was silently unreachable by the assistant even though the admin
 * UI reported success.
 *
 * Only unembedded chunks are processed, so repeated runs are cheap and never
 * re-bill for content that is already indexed.
 */
export async function indexPendingKnowledgeChunks() {
  if (!isOpenAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const pending = await prisma.documentChunk.findMany({
    where: { embedding: null },
    select: { id: true, content: true, documentId: true },
    orderBy: { chunkIndex: "asc" },
  });

  const usable = pending.filter((chunk) => chunk.content.trim().length > 0);
  if (usable.length === 0) return { embedded: 0, documents: 0 };

  const prepared = usable.map((chunk) => {
    const synonyms = enrichChunkWithSynonyms(chunk.content);
    return { ...chunk, synonyms, searchText: [chunk.content, ...synonyms].join(" ") };
  });

  const embeddings = await embedTexts(prepared.map((p) => p.searchText));

  let embedded = 0;
  for (let i = 0; i < prepared.length; i++) {
    const embedding = embeddings[i];
    if (!embedding) continue; // leave unembedded rather than storing an empty vector
    await prisma.documentChunk.update({
      where: { id: prepared[i].id },
      data: {
        embedding: JSON.stringify(embedding),
        synonyms: JSON.stringify(prepared[i].synonyms),
      },
    });
    embedded++;
  }

  const documentIds = [...new Set(prepared.map((p) => p.documentId))];
  if (embedded > 0) {
    await prisma.knowledgeDocument.updateMany({
      where: { id: { in: documentIds } },
      data: { status: "indexed" },
    });
  }

  return { embedded, documents: documentIds.length };
}
