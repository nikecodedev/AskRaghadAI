import { NextResponse } from "next/server";
import { getDatabaseUrlDiagnostics } from "@/lib/db/connection-string";
import { pingDatabase } from "@/lib/db/neon-http";

export const dynamic = "force-dynamic";

/** Bump when DB/health logic changes — confirms new build is live on Hostinger. */
const HEALTH_VERSION = "neon-http-v3";

/**
 * Public diagnostic endpoint (no secrets exposed).
 * Visit https://askraghadai.com/api/health after deploying.
 */
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET?.trim()),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY?.trim()),
    ADMIN_EMAIL: Boolean(process.env.ADMIN_EMAIL?.trim()),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
  };

  const urlCheck = getDatabaseUrlDiagnostics();
  const db = urlCheck.valid
    ? await pingDatabase()
    : { ok: false, latencyMs: 0, error: urlCheck.error ?? "Invalid DATABASE_URL" };

  const ok = db.ok && env.DATABASE_URL && env.AUTH_SECRET;

  return NextResponse.json(
    {
      ok,
      version: HEALTH_VERSION,
      engine: "neon-http",
      db: {
        connected: db.ok,
        latencyMs: db.latencyMs,
        host: urlCheck.host,
        urlValid: urlCheck.valid,
        urlLength: urlCheck.length,
        hadQuotesInEnv: urlCheck.hadQuotes,
        error: db.error,
      },
      env,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
