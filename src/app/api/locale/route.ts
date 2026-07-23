import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locale";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const locale = body?.locale;

    if (!isLocale(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true, locale });
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
