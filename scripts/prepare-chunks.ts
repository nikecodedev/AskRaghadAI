/**
 * Export chunks to JSON (no network required).
 */
import { writeFileSync } from "fs";
import path from "path";
import { loadSampleKnowledgeBase } from "../src/lib/rag/sample-loader";
import { prepareChunksForIndexing } from "../src/lib/rag/openai-rag";

const chunks = prepareChunksForIndexing(loadSampleKnowledgeBase());
const out = chunks.map((c) => ({
  id: c.id,
  content: c.content,
  searchText: c.searchText,
  metadata: c.metadata,
}));

const outPath = path.join(process.cwd(), "prisma", "chunks-to-embed.json");
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Prepared ${out.length} chunks -> ${outPath}`);
