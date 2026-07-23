/**
 * Apply schema with Neon direct host (pooler often breaks prisma db push on Windows).
 * Reads DATABASE_URL from .env and swaps -pooler host if present.
 */
import "dotenv/config";
import { execSync } from "child_process";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL missing in .env");
  process.exit(1);
}

const directUrl = url
  .replace("-pooler.", ".")
  .replace("&channel_binding=require", "")
  .replace("?channel_binding=require&", "?")
  .replace("?channel_binding=require", "");

process.env.DATABASE_URL = directUrl;
console.log("Running prisma db push (direct Neon host, credentials hidden)...");
execSync("npx prisma db push", { stdio: "inherit", env: process.env });
console.log("Done.");
