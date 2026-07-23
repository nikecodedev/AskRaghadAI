import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { deleteCategoryCard, updateCategoryCard } from "@/lib/category-cards/store";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const card = await updateCategoryCard(id, {
    titleEn: body.titleEn != null ? String(body.titleEn).trim() : undefined,
    titleAr: body.titleAr != null ? String(body.titleAr).trim() : undefined,
    descriptionEn:
      body.descriptionEn != null ? String(body.descriptionEn).trim() : undefined,
    descriptionAr:
      body.descriptionAr != null ? String(body.descriptionAr).trim() : undefined,
    link: body.link != null ? String(body.link).trim() : undefined,
    imageUrl: body.imageUrl != null ? String(body.imageUrl).trim() : undefined,
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
    active: body.active != null ? Boolean(body.active) : undefined,
  });

  return NextResponse.json({ card });
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteCategoryCard(id);
  return NextResponse.json({ ok: true });
}
