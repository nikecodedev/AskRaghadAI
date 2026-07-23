import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getAllSettings, setSettings } from "@/lib/settings/store";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getAllSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const values = body.values && typeof body.values === "object" ? body.values : {};
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") clean[key] = value;
  }

  await setSettings(clean);
  return NextResponse.json({ ok: true });
}
