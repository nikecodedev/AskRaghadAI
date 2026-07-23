import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "raghad-session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set");
    }
    return new TextEncoder().encode("dev-secret-change-me");
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = {
  userId: string;
  email: string;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { COOKIE_NAME };
