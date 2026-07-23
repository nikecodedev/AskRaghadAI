import "dotenv/config";
import { indexSampleKnowledgeBase } from "../src/lib/rag/index-service";

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("ERROR: OPENAI_API_KEY missing. Add it to .env first.");
    process.exit(1);
  }

  console.log("Indexing knowledge base...");
  const result = await indexSampleKnowledgeBase();
  console.log(`Done. ${result.chunkCount} chunks indexed.`);
}

main().catch((err) => {
  console.error("Indexing failed:", err instanceof Error ? err.message : err);
  console.error("\nTips:");
  console.error("- Check your internet connection");
  console.error("- Try a VPN if OpenAI is blocked in your region");
  console.error("- Verify OPENAI_API_KEY is valid in .env");
  process.exit(1);
});
