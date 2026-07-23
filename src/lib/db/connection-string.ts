/**
 * Normalize DATABASE_URL for production hosts (e.g. Hostinger).
 *
 * Hostinger often stores values with:
 *  - literal surrounding quotes
 *  - trailing newlines / spaces
 *  - channel_binding=require (breaks Node drivers)
 *  - postgres:// instead of postgresql://
 */
export function getDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL ?? "")
    .replace(/^\uFEFF/, "") // BOM
    .replace(/[\r\n\t]/g, "")
    .trim();

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Strip repeated layers of surrounding quotes (Hostinger import quirk).
  let prev = "";
  while (url !== prev) {
    prev = url;
    url = url.trim();
    if (
      (url.startsWith('"') && url.endsWith('"')) ||
      (url.startsWith("'") && url.endsWith("'"))
    ) {
      url = url.slice(1, -1).trim();
    }
    // Escaped quotes from some panels: \"...\"
    if (
      (url.startsWith('\\"') && url.endsWith('\\"')) ||
      (url.startsWith("\\'") && url.endsWith("\\'"))
    ) {
      url = url.slice(2, -2).trim();
    }
  }

  // If the whole value was URL-encoded once, decode it.
  if (url.includes("%") && !url.includes("://")) {
    try {
      url = decodeURIComponent(url).trim();
    } catch {
      /* keep original */
    }
  }

  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
  }

  // Neon + Prisma expect postgresql:// scheme.
  url = url.replace(/^postgres:\/\//i, "postgresql://");

  // channel_binding=require breaks @neondatabase/serverless on many Node hosts.
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    url = parsed.toString();
  } catch {
    url = url
      .replace(/([?&])channel_binding=[^&]*/gi, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }

  // Must be parseable after normalization.
  try {
    new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL after normalization");
  }

  return url;
}

/** Safe host label for /api/health (no credentials). */
export function getDatabaseHost(): string {
  try {
    return new URL(getDatabaseUrl()).hostname;
  } catch {
    return "invalid-url";
  }
}

/** Diagnostics for /api/health — never exposes password. */
export function getDatabaseUrlDiagnostics(): {
  valid: boolean;
  host: string;
  length: number;
  hadQuotes: boolean;
  error?: string;
} {
  const raw = (process.env.DATABASE_URL ?? "").trim();
  const hadQuotes = /^["']|["']$/.test(raw);
  try {
    const normalized = getDatabaseUrl();
    return {
      valid: true,
      host: new URL(normalized).hostname,
      length: normalized.length,
      hadQuotes,
    };
  } catch (error) {
    return {
      valid: false,
      host: "invalid-url",
      length: raw.length,
      hadQuotes,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
