/**
 * Server-side visitor country detection, shared by /api/geo and the chat
 * route so both agree on where a visitor is.
 *
 * Detection is done on the server rather than trusting a value from the
 * browser: the client already stores a region in localStorage for currency
 * display, but product routing decides which affiliate links someone is sent
 * to, so it should not be settable by the caller.
 */

function firstForwardedIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "";
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("true-client-ip") ||
    ""
  );
}

/** Country supplied directly by a CDN/proxy — free and instant when present. */
export function countryFromHeaders(headers: Headers): string | null {
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country-code"),
    headers.get("cloudfront-viewer-country"),
  ];
  for (const value of candidates) {
    if (value && value !== "XX" && /^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
  }
  return null;
}

function isPrivateIp(ip: string): boolean {
  return (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/** In-process cache so repeated chats from one visitor don't re-query a lookup service. */
const ipCache = new Map<string, { country: string | null; expiresAt: number }>();
const IP_CACHE_TTL_MS = 60 * 60 * 1000;

export async function countryFromIp(ip: string): Promise<string | null> {
  if (isPrivateIp(ip)) return null;

  const cached = ipCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.country;

  let country: string | null = null;
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_code/`, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const code = (await res.text()).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(code) && code !== "XX") country = code;
    }
  } catch {
    // Lookup is best-effort; an unknown country simply means no geo preference.
  }

  if (ipCache.size > 5000) ipCache.clear();
  ipCache.set(ip, { country, expiresAt: Date.now() + IP_CACHE_TTL_MS });
  return country;
}

/**
 * Best-effort country for this request. Headers first (instant), then an IP
 * lookup. Returns null when unknown, which callers must treat as "no
 * restriction" rather than as a default country — guessing wrong would route
 * a visitor to stores that cannot ship to them.
 */
export async function detectCountry(request: Request): Promise<string | null> {
  const fromHeader = countryFromHeaders(request.headers);
  if (fromHeader) return fromHeader;
  return countryFromIp(firstForwardedIp(request.headers));
}
