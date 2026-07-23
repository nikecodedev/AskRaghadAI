import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import {
  createCategoryCard,
  getNextCategorySortOrder,
  listAllCategoryCards,
} from "@/lib/category-cards/store";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await listAllCategoryCards();
  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const sortOrder =
    body.sortOrder != null && body.sortOrder !== ""
      ? Number(body.sortOrder)
      : await getNextCategorySortOrder();

  const card = await createCategoryCard({
    titleEn: String(body.titleEn ?? "").trim(),
    titleAr: String(body.titleAr ?? "").trim(),
    descriptionEn: String(body.descriptionEn ?? "").trim(),
    descriptionAr: String(body.descriptionAr ?? "").trim(),
    link: String(body.link ?? "/chat").trim() || "/chat",
    imageUrl: String(body.imageUrl ?? "").trim(),
    sortOrder,
    active: body.active !== false,
  });

  return NextResponse.json({ card });
}
