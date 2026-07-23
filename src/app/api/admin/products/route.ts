import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { listAllProducts } from "@/lib/products/store";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await listAllProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const product = await prisma.product.create({
    data: {
      category: String(body.category ?? "fashion"),
      nameEn: String(body.nameEn ?? ""),
      nameAr: String(body.nameAr ?? ""),
      descriptionEn: body.descriptionEn ? String(body.descriptionEn) : null,
      descriptionAr: body.descriptionAr ? String(body.descriptionAr) : null,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      price: body.price != null ? Number(body.price) : null,
      currency: String(body.currency ?? "SAR"),
      affiliateUrl: body.affiliateUrl ? String(body.affiliateUrl) : null,
      discountCode: body.discountCode ? String(body.discountCode) : null,
      active: body.active !== false,
    },
  });

  return NextResponse.json({ product });
}
