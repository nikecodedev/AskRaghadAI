import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { indexSampleKnowledgeBase } from "@/lib/rag/index-service";

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

  // Store as single chunk for MVP — full indexing via reindex endpoint
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

  return NextResponse.json({ document: doc });
}

export async function PUT() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await indexSampleKnowledgeBase();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Index failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
