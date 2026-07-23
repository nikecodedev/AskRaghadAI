import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authErrorMessage } from "@/lib/auth/errors";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = body.name ? String(body.name).trim() : null;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash, name });

    const token = await createSessionToken({ userId: user.id, email: user.email });
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
    console.error("[register]", error);
    return NextResponse.json(
      { error: authErrorMessage(error, "Registration failed. Please try again.") },
      { status: 503 },
    );
  }
}
