import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id },
    data: {
      category: body.category != null ? String(body.category) : undefined,
      nameEn: body.nameEn != null ? String(body.nameEn) : undefined,
      nameAr: body.nameAr != null ? String(body.nameAr) : undefined,
      descriptionEn: body.descriptionEn !== undefined ? String(body.descriptionEn) : undefined,
      descriptionAr: body.descriptionAr !== undefined ? String(body.descriptionAr) : undefined,
      imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
      currency: body.currency != null ? String(body.currency) : undefined,
      affiliateUrl: body.affiliateUrl !== undefined ? String(body.affiliateUrl) : undefined,
      discountCode: body.discountCode !== undefined ? String(body.discountCode) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    },
  });

  return NextResponse.json({ product });
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
