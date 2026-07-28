import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, createSessionToken, getSession } from "@/lib/auth/session";
import { findUserById, updateUserPassword } from "@/lib/auth/user-store";
import { authErrorMessage } from "@/lib/auth/errors";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 },
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, passwordHash);

    // updateUserPassword bumps tokenVersion, which invalidates every session
    // issued before this point — including the one making this request. Hand
    // back a freshly signed cookie so the person who just changed their own
    // password stays signed in, while any other device is logged out.
    const refreshed = await findUserById(user.id);
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      tv: refreshed?.tokenVersion ?? 0,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("[change-password]", error);
    return NextResponse.json(
      { error: authErrorMessage(error, "Could not update password. Please try again.") },
      { status: 503 },
    );
  }
}
