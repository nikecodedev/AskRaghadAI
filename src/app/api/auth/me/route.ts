import { NextResponse } from "next/server";
import { getSession, COOKIE_NAME } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/user-store";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const isAdmin =
      user.role === "admin" ||
      Boolean(adminEmail && user.email.toLowerCase() === adminEmail);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        region: user.region,
        role: user.role,
        isAdmin,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
