/**
 * Import pre-computed embeddings into the database (no network required).
 */
import { readFileSync } from "fs";
import path from "path";
import { saveIndexedChunksToDb } from "../src/lib/rag/db-store";
import { setIndexedChunks } from "../src/lib/rag/memory-store";
import type { IndexedChunk } from "../src/lib/rag/openai-rag";

async function main() {
  const cachePath = path.join(process.cwd(), "prisma", "embeddings-cache.json");
  const raw = readFileSync(cachePath, "utf-8").replace(/^\uFEFF/, "");
  const items = JSON.parse(raw) as IndexedChunk[];

  if (!items.length) throw new Error("No embeddings in cache file");

  await saveIndexedChunksToDb(items, {
    filename: "sample-knowledge-base",
    region: "ksa",
    category: "general",
  });
  setIndexedChunks(items);
  console.log(`Imported ${items.length} chunks into database.`);
}

main().catch((err) => {
  console.error("Import failed:", err.message ?? err);
  process.exit(1);
});
