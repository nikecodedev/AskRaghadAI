import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authErrorMessage } from "@/lib/auth/errors";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/user-store";
import {
  checkRateLimit,
  getClientIp,
  LOGIN_RULE,
  resetRateLimit,
  tooManyRequests,
} from "@/lib/auth/rate-limit";

/**
 * A real bcrypt hash of a throwaway value. Comparing against this when the
 * account does not exist keeps the response time roughly the same as a wrong
 * password on a real account — otherwise a missing account answers in
 * database-lookup time while a real one pays ~100ms of hashing, which is
 * enough to tell an attacker which addresses are registered.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Limit per IP and per account: one attacker grinding a single account,
    // and a stuffing run spreading known passwords across many, are different
    // attacks and neither is caught by the other's counter.
    const ip = getClientIp(request);
    for (const key of [`login:ip:${ip}`, `login:acct:${email}`]) {
      const { allowed, retryAfterSeconds } = checkRateLimit(key, LOGIN_RULE);
      if (!allowed) {
        return tooManyRequests(
          "Too many sign-in attempts. Please wait a few minutes and try again.",
          retryAfterSeconds,
        );
      }
    }

    const user = await findUserByEmail(email);

    // Always run a comparison, even with no matching account, so the two
    // paths take similar time.
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Genuine sign-in — clear the counters so a legitimate user who mistyped
    // a couple of times isn't left throttled.
    resetRateLimit(`login:ip:${ip}`);
    resetRateLimit(`login:acct:${email}`);

    const token = await createSessionToken({ userId: user.id, email: user.email, tv: user.tokenVersion ?? 0 });
    const response = NextResponse.json({ ok: true, userId: user.id });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json(
      { error: authErrorMessage(error, "Login failed. Please try again.") },
      { status: 503 },
    );
  }
}
