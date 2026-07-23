/**
 * Create (or update) an admin user directly in the Neon database via HTTP.
 * Bypasses the native Prisma query engine (which crashes on this host).
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <password> [name]
 *
 * If no arguments are given, falls back to ADMIN_EMAIL from .env and a
 * generated password (printed at the end).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

function generatePassword() {
  // Readable, reasonably strong temporary password.
  return `Raghad-${randomBytes(4).toString("hex")}!`;
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");

  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) {
    throw new Error("No email provided (pass as first argument or set ADMIN_EMAIL).");
  }
  const password = process.argv[3] || generatePassword();
  const name = process.argv[4] || "Administrator";

  const sql = neon(url);
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await sql`SELECT "id" FROM "User" WHERE "email" = ${email} LIMIT 1`;

  if (existing.length > 0) {
    await sql`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash}, "role" = 'admin', "name" = ${name}, "updatedAt" = NOW()
      WHERE "email" = ${email}
    `;
    console.log(`Updated existing user -> admin: ${email}`);
  } else {
    const id = cuidLike();
    await sql`
      INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "region", "createdAt", "updatedAt")
      VALUES (${id}, ${email}, ${name}, ${passwordHash}, 'admin', 'ksa', NOW(), NOW())
    `;
    console.log(`Created new admin user: ${email}`);
  }

  console.log("\n==============================");
  console.log("  ADMIN CREDENTIALS");
  console.log("==============================");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("==============================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
