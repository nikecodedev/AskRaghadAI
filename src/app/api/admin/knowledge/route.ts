import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { indexPendingKnowledgeChunks, indexSampleKnowledgeBase } from "@/lib/rag/index-service";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.knowledgeDocument.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const title = String(body.title ?? "Untitled");
  const content = String(body.content ?? "");
  const category = body.category ? String(body.category) : "general";
  const filename = String(body.filename ?? `upload-${Date.now()}.txt`);

  if (!content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const doc = await prisma.knowledgeDocument.create({
    data: {
      title,
      filename,
      category,
      region: "ksa",
      status: "pending",
    },
  });

  await prisma.documentChunk.create({
    data: {
      documentId: doc.id,
      content,
      chunkIndex: 0,
    },
  });

  await prisma.knowledgeDocument.update({
    where: { id: doc.id },
    data: { status: "uploaded" },
  });

  // Embed immediately so the content is actually usable by the assistant.
  // Without this the chunk sits with embedding = null and is filtered out of
  // retrieval forever, which is why previously-added FAQs and documents were
  // invisible to the chat despite the panel reporting a successful save.
  // Best-effort: a failed embedding must not lose the admin's content, it
  // just leaves the row pending for the next reindex.
  let indexed = false;
  try {
    const result = await indexPendingKnowledgeChunks();
    indexed = result.embedded > 0;
  } catch (error) {
    console.error("[admin/knowledge] auto-index failed, left pending", error);
  }

  return NextResponse.json({ document: doc, indexed });
}

export async function PUT() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Refresh the bundled sample KB, then embed everything the admin has
    // added through the panel. The second step is the one that matters —
    // reindex used to only re-read the static sample files, so uploaded
    // documents and FAQs were never actually indexed.
    const sample = await indexSampleKnowledgeBase();
    const pending = await indexPendingKnowledgeChunks();
    return NextResponse.json({
      ok: true,
      chunkCount: sample.chunkCount,
      embedded: pending.embedded,
      documents: pending.documents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Index failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
