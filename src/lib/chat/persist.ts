import { prisma } from "@/lib/db/prisma";

export async function persistChatExchange(
  userId: string,
  userContent: string,
  assistantContent: string,
) {
  const title = userContent.trim().slice(0, 80) || "Chat";

  let conversation = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId, title },
    });
  } else if (!conversation.title && title) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title },
    });
  }

  await prisma.message.createMany({
    data: [
      { conversationId: conversation.id, role: "user", content: userContent },
      { conversationId: conversation.id, role: "assistant", content: assistantContent },
    ],
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });
}
