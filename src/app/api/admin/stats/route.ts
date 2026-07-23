import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [users, products, messages, categoryCards, lastProductSync] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.contactMessage.count(),
    prisma.categoryCard.count(),
    prisma.product.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  return NextResponse.json({
    users,
    products,
    messages,
    categoryCards,
    lastSyncAt: lastProductSync?.updatedAt ?? null,
  });
}
