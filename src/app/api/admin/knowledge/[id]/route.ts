import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const document = await prisma.knowledgeDocument.findUnique({
    where: { id },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = document.chunks.map((c) => c.content).join("\n\n");

  const url = new URL(request.url);
  if (url.searchParams.get("download") === "1") {
    const safeName = document.title.replace(/[^\w\- ]+/g, "").trim() || "document";
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.txt"`,
      },
    });
  }

  return NextResponse.json({
    document: { id: document.id, title: document.title, category: document.category, content },
  });
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const title = body.title != null ? String(body.title) : undefined;
  const content = body.content != null ? String(body.content) : undefined;

  if (title) {
    await prisma.knowledgeDocument.update({ where: { id }, data: { title, status: "uploaded" } });
  }
  if (content != null) {
    await prisma.documentChunk.deleteMany({ where: { documentId: id } });
    await prisma.documentChunk.create({ data: { documentId: id, content, chunkIndex: 0 } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.knowledgeDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
