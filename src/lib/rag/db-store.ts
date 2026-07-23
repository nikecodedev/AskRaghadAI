import { prisma } from "@/lib/db/prisma";
import type { IndexedChunk } from "./openai-rag";

const SAMPLE_DOC_TITLE = "Raghad AI Knowledge Base";

export async function getIndexedChunkCount(): Promise<number> {
  return prisma.documentChunk.count({
    where: { embedding: { not: null } },
  });
}

export async function isDbIndexReady(): Promise<boolean> {
  return (await getIndexedChunkCount()) > 0;
}

export async function loadIndexedChunksFromDb(): Promise<IndexedChunk[]> {
  const rows = await prisma.documentChunk.findMany({
    where: { embedding: { not: null } },
    orderBy: { chunkIndex: "asc" },
    include: { document: true },
  });

  return rows.map((row) => {
    const synonyms = row.synonyms ? (JSON.parse(row.synonyms) as string[]) : [];
    return {
      id: row.id,
      content: row.content,
      embedding: JSON.parse(row.embedding!) as number[],
      searchText: [row.content, ...synonyms].join(" "),
      metadata: {
        source: row.document.filename,
        region: row.document.region ?? undefined,
        category: row.document.category ?? undefined,
        synonyms,
        chunkIndex: row.chunkIndex,
      },
    };
  });
}

export async function saveIndexedChunksToDb(
  chunks: IndexedChunk[],
  meta: { filename: string; region?: string; category?: string } = {
    filename: "sample-knowledge-base",
  }
): Promise<number> {
  const existing = await prisma.knowledgeDocument.findFirst({
    where: { filename: meta.filename },
  });

  if (existing) {
    await prisma.documentChunk.deleteMany({ where: { documentId: existing.id } });
  }

  const doc = existing
    ? await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: { status: "indexed", region: meta.region ?? "ksa", category: meta.category ?? "general" },
      })
    : await prisma.knowledgeDocument.create({
        data: {
          title: SAMPLE_DOC_TITLE,
          filename: meta.filename,
          region: meta.region ?? "ksa",
          category: meta.category ?? "general",
          status: "indexed",
        },
      });

  await prisma.documentChunk.createMany({
    data: chunks.map((chunk, i) => ({
      documentId: doc.id,
      content: chunk.content,
      chunkIndex: chunk.metadata.chunkIndex ?? i,
      synonyms: JSON.stringify(chunk.metadata.synonyms ?? []),
      embedding: JSON.stringify(chunk.embedding ?? []),
    })),
  });

  return chunks.length;
}
