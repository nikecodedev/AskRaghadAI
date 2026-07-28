import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth/user-store";
import { createPasswordResetToken } from "@/lib/auth/password-reset-store";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email/send-mail";
import { checkRateLimit, getClientIp, RESET_RULE, tooManyRequests } from "@/lib/auth/rate-limit";

const GENERIC_OK =
  "If an account exists for that email, password reset instructions have been sent.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const locale = body.locale === "ar" ? "ar" : "en";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Throttle before doing any work, including the configuration check, so
    // the endpoint cannot be hammered regardless of how it would answer. This
    // endpoint sends outbound mail to a caller-supplied address, so unlimited
    // it doubles as an email-bombing tool and burns the SMTP quota.
    const ip = getClientIp(request);
    for (const key of [`reset:ip:${ip}`, `reset:acct:${email}`]) {
      const { allowed, retryAfterSeconds } = checkRateLimit(key, RESET_RULE);
      if (!allowed) {
        return tooManyRequests(
          "Too many password reset requests. Please wait before trying again.",
          retryAfterSeconds,
        );
      }
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "Password reset email is not configured yet. Please contact support.",
        },
        { status: 503 },
      );
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
