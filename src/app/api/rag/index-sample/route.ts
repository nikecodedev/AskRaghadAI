import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { indexSampleKnowledgeBase } from "@/lib/rag/index-service";
import { isOpenAIConfigured } from "@/lib/rag/openai-rag";
import { getRagStatus } from "@/lib/rag/store";

export async function POST() {
  // This triggers billable OpenAI embedding calls and rewrites the knowledge
  // index, so it must be admin-only — it was previously reachable by anyone.
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured", indexed: false },
      { status: 503 }
    );
  }

  try {
    const result = await indexSampleKnowledgeBase();
    return NextResponse.json({
      indexed: true,
      chunkCount: result.chunkCount,
      message: "Knowledge base indexed successfully",
    });
  } catch (error) {
    console.error("[index-sample]", error);
    return NextResponse.json({ error: "Indexing failed" }, { status: 500 });
  }
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getRagStatus();
  return NextResponse.json({
    ...status,
    openaiConfigured: isOpenAIConfigured(),
  });
}
