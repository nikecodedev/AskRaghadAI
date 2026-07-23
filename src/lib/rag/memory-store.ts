import type { IndexedChunk } from "./openai-rag";

/** In-memory store for prep phase — replace with DB-backed store when client DB is ready */
let indexedChunks: IndexedChunk[] = [];

export function setIndexedChunks(chunks: IndexedChunk[]) {
  indexedChunks = chunks;
}

export function getIndexedChunks(): IndexedChunk[] {
  return indexedChunks;
}

export function isIndexReady(): boolean {
  return indexedChunks.length > 0;
}
