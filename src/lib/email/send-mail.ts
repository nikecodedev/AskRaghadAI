import type { Locale } from "@/lib/i18n/types";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function sendViaResend(input: SendMailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  return res.ok;
}

async function sendViaSmtp(input: SendMailInput): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!host || !user || !pass || !from) return false;

  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure = process.env.SMTP_SECURE !== "false";

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return true;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  locale: Locale,
): Promise<boolean> {
  const isAr = locale === "ar";
  const subject = isAr
    ? "إعادة تعيين كلمة المرور — Raghad AI"
    : "Reset your Raghad AI password";
  const html = isAr
    ? `<p>مرحباً،</p><p>لإعادة تعيين كلمة المرور، اضغط على الرابط التالي (صالح لمدة ساعة):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>`
    : `<p>Hello,</p><p>To reset your password, use this link (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`;
  const text = isAr
    ? `لإعادة تعيين كلمة المرور: ${resetUrl}`
    : `Reset your password: ${resetUrl}`;

  const input: SendMailInput = { to, subject, html, text };
  if (await sendViaResend(input)) return true;
  if (await sendViaSmtp(input)) return true;
  return false;
}

export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()) return true;
  if (
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim() &&
    process.env.EMAIL_FROM?.trim()
  ) {
    return true;
  }
  return false;
}
