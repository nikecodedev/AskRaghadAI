import { randomBytes } from "crypto";
import { getNeonSql } from "@/lib/db/neon-http";

export type DbUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: string;
  region: string;
};

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

function firstRow<T>(rows: unknown): T | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as T;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT id, email, name, "passwordHash", role, region
    FROM "User"
    WHERE email = ${email}
    LIMIT 1
  `;
  return firstRow<DbUser>(rows);
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const sql = getNeonSql();
  const rows = await sql`
    SELECT id, email, name, "passwordHash", role, region
    FROM "User"
    WHERE id = ${id}
    LIMIT 1
  `;
  return firstRow<DbUser>(rows);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string | null;
}): Promise<DbUser> {
  const sql = getNeonSql();
  const id = cuidLike();
  const rows = await sql`
    INSERT INTO "User" (id, email, name, "passwordHash", role, region, "createdAt", "updatedAt")
    VALUES (${id}, ${input.email}, ${input.name}, ${input.passwordHash}, 'user', 'ksa', NOW(), NOW())
    RETURNING id, email, name, "passwordHash", role, region
  `;
  const user = firstRow<DbUser>(rows);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const sql = getNeonSql();
  await sql`
    UPDATE "User"
    SET "passwordHash" = ${passwordHash}, "updatedAt" = NOW()
    WHERE id = ${userId}
  `;
}
