import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { pullProductsFromSheet, pushProductsToSheet } from "@/lib/sheets/sync";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const direction = body.direction === "push" ? "push" : "pull";

  try {
    const result =
      direction === "push" ? await pushProductsToSheet() : await pullProductsFromSheet();
    return NextResponse.json({ ok: true, direction, result });
  } catch (error) {
    console.error("[sheets-sync]", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
