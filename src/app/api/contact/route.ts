import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSupportEmail } from "@/lib/settings/store";
import { sendContactNotification } from "@/lib/email/send-mail";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await prisma.contactMessage.create({
      data: { name, email, message },
    });

    // Best-effort forwarding — the message is already saved and viewable in
    // the admin inbox even if outbound email isn't configured or fails.
    const supportEmail = await getSupportEmail();
    sendContactNotification(supportEmail, { name, email, message }).catch((err) =>
      console.error("[contact] notification failed", err),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
