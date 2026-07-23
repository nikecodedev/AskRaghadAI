import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authErrorMessage } from "@/lib/auth/errors";
import { COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

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
    console.error("[login]", error);
    return NextResponse.json(
      { error: authErrorMessage(error, "Login failed. Please try again.") },
      { status: 503 },
    );
  }
}
