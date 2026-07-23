import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/user-store";

export async function getAdminUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user) return null;

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin =
    user.role === "admin" ||
    (adminEmail && user.email.toLowerCase() === adminEmail);

  return isAdmin ? user : null;
}
