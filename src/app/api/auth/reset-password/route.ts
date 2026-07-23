import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { consumePasswordResetToken } from "@/lib/auth/password-reset-store";
import { updateUserPassword } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const consumed = await consumePasswordResetToken(token);
    if (!consumed) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await updateUserPassword(consumed.userId, passwordHash);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: "Reset failed. Please try again." },
      { status: 503 },
    );
  }
}
