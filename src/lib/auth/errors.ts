import { Prisma } from "@prisma/client";

const DB_UNAVAILABLE =
  "Service is temporarily unavailable (database connection). Please try again shortly.";

function looksLikeConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = `${error.name} ${error.message}`.toLowerCase();
  return (
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound") ||
    msg.includes("fetch failed") ||
    msg.includes("websocket") ||
    msg.includes("connection") ||
    msg.includes("connect") ||
    msg.includes("database_url") ||
    msg.includes("terminated")
  );
}

export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return DB_UNAVAILABLE;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P1001") {
      return DB_UNAVAILABLE;
    }
  }
  if (error instanceof SyntaxError) {
    return "Invalid request. Please check your details and try again.";
  }
  // Neon driver-adapter connection failures surface as generic errors rather
  // than Prisma's own classes — detect them so the client sees a clear message.
  if (looksLikeConnectionError(error)) {
    return DB_UNAVAILABLE;
  }
  return fallback;
}
