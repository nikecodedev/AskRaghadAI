import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth/user-store";
import { createPasswordResetToken } from "@/lib/auth/password-reset-store";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email/send-mail";

const GENERIC_OK =
  "If an account exists for that email, password reset instructions have been sent.";

export async function POST(request: Request) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "Password reset email is not configured yet. Please contact support.",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const locale = body.locale === "ar" ? "ar" : "en";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const base =
        process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
        new URL(request.url).origin;
      const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;
      const sent = await sendPasswordResetEmail(user.email, resetUrl, locale);
      if (!sent) {
        console.error("[forgot-password] email send failed for", email);
        return NextResponse.json(
          { error: "Could not send reset email. Please try again later." },
          { status: 503 },
        );
      }
    }

    // Always return the same message (do not reveal whether email exists).
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { error: "Request failed. Please try again." },
      { status: 503 },
    );
  }
}
