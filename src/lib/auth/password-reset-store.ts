import { createHash, randomBytes } from "crypto";
import { getNeonSql } from "@/lib/db/neon-http";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

let tableReady: Promise<void> | null = null;

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function ensurePasswordResetTable() {
  const sql = getNeonSql();
  await sql`
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
    ON "PasswordResetToken"("userId")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_idx"
    ON "PasswordResetToken"("tokenHash")
  `;
}

async function ensureTableOnce() {
  if (!tableReady) {
    tableReady = ensurePasswordResetTable();
  }
  await tableReady;
}

/** Creates a reset token; returns the raw token (send once in email). */
export async function createPasswordResetToken(userId: string): Promise<string> {
  await ensureTableOnce();
  const sql = getNeonSql();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const id = cuidLike();

  await sql`DELETE FROM "PasswordResetToken" WHERE "userId" = ${userId}`;
  await sql`
    INSERT INTO "PasswordResetToken" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
    VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt}, NOW())
  `;

  return rawToken;
}

export async function consumePasswordResetToken(
  rawToken: string,
): Promise<{ userId: string } | null> {
  await ensureTableOnce();
  const sql = getNeonSql();
  const tokenHash = hashToken(rawToken.trim());
  const rows = await sql`
    SELECT "userId", "expiresAt"
    FROM "PasswordResetToken"
    WHERE "tokenHash" = ${tokenHash}
    LIMIT 1
  `;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0] as { userId: string; expiresAt: Date | string };
  const expires = new Date(row.expiresAt);
  if (expires.getTime() < Date.now()) {
    await sql`DELETE FROM "PasswordResetToken" WHERE "tokenHash" = ${tokenHash}`;
    return null;
  }
  await sql`DELETE FROM "PasswordResetToken" WHERE "tokenHash" = ${tokenHash}`;
  return { userId: row.userId };
}
