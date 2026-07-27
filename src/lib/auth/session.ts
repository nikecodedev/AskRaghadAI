import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "raghad-session";

function secret() {
  const value = process.env.AUTH_SECRET?.trim();
  // Fail closed rather than falling back to a committed placeholder. The old
  // guard only threw when NODE_ENV was exactly "production", so any other
  // deployment (staging, a container started in dev mode) would sign sessions
  // with a secret published in this repo — enough for anyone to mint a valid
  // admin cookie.
  if (!value) {
    throw new Error("AUTH_SECRET is not set — refusing to sign sessions with a default secret");
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
