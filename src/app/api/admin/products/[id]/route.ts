import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Clearing an optional field sends null, which must be stored as SQL NULL.
  // String(null) yields the literal text "null" and Number(null) yields 0, so
  // the previous form put "null" into descriptions shown on product cards and
  // silently priced cleared products at 0.
  const optionalText = (value: unknown) =>
    value === undefined ? undefined : value === null || String(value).trim() === "" ? null : String(value);

  const price =
    body.price === undefined
      ? undefined
      : body.price === null || String(body.price).trim() === ""
        ? null
        : Number(body.price);
  if (price !== undefined && price !== null && !Number.isFinite(price)) {
    return NextResponse.json({ error: "Price must be a number" }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        category: body.category != null ? String(body.category) : undefined,
        nameEn: body.nameEn != null ? String(body.nameEn) : undefined,
        nameAr: body.nameAr != null ? String(body.nameAr) : undefined,
        descriptionEn: optionalText(body.descriptionEn),
        descriptionAr: optionalText(body.descriptionAr),
        imageUrl: optionalText(body.imageUrl),
        price,
        currency: body.currency != null ? String(body.currency) : undefined,
        affiliateUrl: optionalText(body.affiliateUrl),
        discountCode: optionalText(body.discountCode),
        bundleId: optionalText(body.bundleId),
        itemRole: body.itemRole != null ? String(body.itemRole) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.error("[admin/products] update", error);
    return NextResponse.json({ error: "Could not update product" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.error("[admin/products] delete", error);
    return NextResponse.json({ error: "Could not delete product" }, { status: 500 });
  }
}
