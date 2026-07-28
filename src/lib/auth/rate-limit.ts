/**
 * Small in-memory rate limiter for the authentication routes.
 *
 * Deliberately in-process rather than Redis-backed: the site runs as a single
 * Node process on Hostinger, so a shared store would add an external
 * dependency without changing the outcome. If the app is ever scaled to
 * multiple instances this must move to a shared store, since each instance
 * would otherwise keep its own counters.
 *
 * Counters are keyed by IP *and* by account, because the two attacks differ:
 * one attacker trying thousands of passwords against a single account, and a
 * credential-stuffing run spreading known passwords across many accounts.
 */

type Bucket = { count: number; resetAt: number; blockedUntil?: number };

const buckets = new Map<string, Bucket>();

// Bound the map so a flood of unique keys can't grow it without limit.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now && (bucket.blockedUntil ?? 0) < now) buckets.delete(key);
  }
}

export type RateLimitRule = {
  /** Attempts allowed inside the window. */
  limit: number;
  /** Rolling window in milliseconds. */
  windowMs: number;
  /** How long to lock the key out once the limit is exceeded. */
  blockMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the caller may retry — surfaced as Retry-After. */
  retryAfterSeconds: number;
};

export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (bucket?.blockedUntil && bucket.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count++;
  if (bucket.count > rule.limit) {
    bucket.blockedUntil = now + rule.blockMs;
    return { allowed: false, retryAfterSeconds: Math.ceil(rule.blockMs / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears a key's counter — called after a genuine success so a legitimate user isn't penalised. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Best-effort client IP. Behind Hostinger's proxy the socket address is the
 * proxy's, so the forwarded headers are the only signal available.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function tooManyRequests(message: string, retryAfterSeconds: number) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, retryAfterSeconds)),
    },
  });
}

/** 5 attempts per 15 minutes, then a 15 minute lockout. */
export const LOGIN_RULE: RateLimitRule = { limit: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };
/** Password reset emails are also an outbound-mail amplifier, so keep this tight. */
export const RESET_RULE: RateLimitRule = { limit: 3, windowMs: 60 * 60_000, blockMs: 60 * 60_000 };
/** Signup abuse is lower risk but still worth bounding. */
export const SIGNUP_RULE: RateLimitRule = { limit: 5, windowMs: 60 * 60_000, blockMs: 30 * 60_000 };
