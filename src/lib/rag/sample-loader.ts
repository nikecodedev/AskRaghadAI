import { readFileSync } from "fs";
import path from "path";
import { chunkText } from "./chunker";

export function loadSampleKnowledgeBase(): ReturnType<typeof chunkText> {
  const baseDir = path.join(process.cwd(), "sample-data");
  const ar = readFileSync(path.join(baseDir, "sample-kb-ar.txt"), "utf-8");
  const en = readFileSync(path.join(baseDir, "sample-kb-en.txt"), "utf-8");

  return [
    ...chunkText(ar, { source: "sample-kb-ar", region: "ksa", category: "general" }),
    ...chunkText(en, { source: "sample-kb-en", region: "ksa", category: "general" }),
  ];
}
