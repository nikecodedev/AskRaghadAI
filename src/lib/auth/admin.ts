import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/user-store";
import type { DbUser } from "@/lib/auth/user-store";

/**
 * Resolves the signed-in user, rejecting sessions that were issued before the
 * account's password last changed. Without that check a stolen cookie stayed
 * valid for its full 7 day life even after the owner reset their password.
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user) return null;

  // Tokens minted before tokenVersion existed carry no `tv`; treat them as 0
  // so they remain valid until that user next changes their password.
  const sessionVersion = session.tv ?? 0;
  if (sessionVersion !== (user.tokenVersion ?? 0)) return null;

  return user;
}

export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin =
    user.role === "admin" ||
    (adminEmail && user.email.toLowerCase() === adminEmail);

  return isAdmin ? user : null;
}
