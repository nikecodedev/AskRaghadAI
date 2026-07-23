import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/settings/store";

// Public — used by AppProviders to overlay admin-edited text onto the
// static i18n defaults. Only ever exposes plain display text, never secrets.
export async function GET() {
  try {
    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[settings]", error);
    return NextResponse.json({ settings: {} });
  }
}
