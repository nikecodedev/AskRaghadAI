import type { IndexedChunk } from "./openai-rag";
import { getIndexedChunks, isIndexReady, setIndexedChunks } from "./memory-store";
import {
  getIndexedChunkCount,
  isDbIndexReady,
  loadIndexedChunksFromDb,
} from "./db-store";

let loadPromise: Promise<IndexedChunk[]> | null = null;

/** Load chunks from memory cache or database (persists across Vercel requests). */
export async function getActiveIndexedChunks(): Promise<IndexedChunk[]> {
  if (isIndexReady()) return getIndexedChunks();

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const ready = await isDbIndexReady();
        if (!ready) return [];
        const chunks = await loadIndexedChunksFromDb();
        setIndexedChunks(chunks);
        return chunks;
      } catch (error) {
        console.error("[rag-store] Failed to load from DB:", error);
        return [];
      } finally {
        loadPromise = null;
      }
    })();
  }

  return loadPromise;
}

export async function isRagIndexReady(): Promise<boolean> {
  if (isIndexReady()) return true;
  try {
    return await isDbIndexReady();
  } catch {
    return false;
  }
}

export async function getRagStatus() {
  const memoryCount = getIndexedChunks().length;
  let dbCount = 0;
  try {
    dbCount = await getIndexedChunkCount();
  } catch {
    /* db unavailable */
  }
  return { memoryCount, dbCount, ready: memoryCount > 0 || dbCount > 0 };
}
