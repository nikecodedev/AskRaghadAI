import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title ?? "Chat",
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
        preview: c.messages[0]?.content?.slice(0, 120) ?? "",
      })),
    });
  } catch (error) {
    console.error("[conversations]", error);
    return NextResponse.json({ error: "Could not load conversations" }, { status: 500 });
  }
}
