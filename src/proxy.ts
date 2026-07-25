import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n/locale";

function ensureLocaleCookie(response: NextResponse, request: NextRequest) {
  const current = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!isLocale(current)) {
    response.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

/** Next.js 16: `proxy` replaces deprecated `middleware` convention. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only verify JWT on routes that need auth redirects (saves work on every page/API).
  const needsSession = pathname.startsWith("/admin") || pathname === "/login";

  if (!needsSession) {
    return ensureLocaleCookie(NextResponse.next(), request);
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/admin") && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return ensureLocaleCookie(NextResponse.redirect(login), request);
  }

  if (pathname === "/login" && session) {
    // Admin-vs-regular routing happens client-side (needs a DB role lookup
    // this edge proxy intentionally skips) — /chat is a safe default for any
    // logged-in user either way.
    return ensureLocaleCookie(
      NextResponse.redirect(new URL("/chat", request.url)),
      request,
    );
  }

  return ensureLocaleCookie(NextResponse.next(), request);
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
