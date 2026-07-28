/**
 * Decides whether a partner serves a given country, based on the free-text
 * Target_Country column in the client's Google Sheet.
 *
 * That column is written by hand and is genuinely inconsistent — the live
 * data contains ISO codes ("SA", "AE"), informal names ("UAE", "KSA"),
 * region groups ("GCC", "Middle East"), wildcards ("ALL", "Global", "All
 * World") and combined values ("UAE & KSA", "ME & India"). Rather than ask
 * the client to re-key 100 rows into a strict format, this normalises what
 * is actually there.
 */

/** Countries covered by each region-style token. */
const GCC = ["AE", "SA", "KW", "QA", "BH", "OM"];
const MIDDLE_EAST = [...GCC, "JO", "LB", "EG", "IQ", "YE", "SY", "PS"];

/** Tokens meaning "available everywhere" — no country restriction. */
const WILDCARDS = new Set([
  "ALL",
  "ALLWORLD",
  "GLOBAL",
  "GLOBALLY",
  "WORLDWIDE",
  "WORLD",
  "INTERNATIONAL",
  "ANY",
  "EVERYWHERE",
]);

/** Informal names and region groups → the ISO codes they cover. */
const ALIASES: Record<string, string[]> = {
  KSA: ["SA"],
  SAUDI: ["SA"],
  SAUDIARABIA: ["SA"],
  UAE: ["AE"],
  EMIRATES: ["AE"],
  UNITEDARABEMIRATES: ["AE"],
  DUBAI: ["AE"],
  ABUDHABI: ["AE"],
  KUWAIT: ["KW"],
  QATAR: ["QA"],
  BAHRAIN: ["BH"],
  OMAN: ["OM"],
  EGYPT: ["EG"],
  JORDAN: ["JO"],
  LEBANON: ["LB"],
  GCC: GCC,
  GULF: GCC,
  ME: MIDDLE_EAST,
  MIDDLEEAST: MIDDLE_EAST,
  MENA: [...MIDDLE_EAST, "MA", "TN", "DZ", "LY", "SD"],
  INDIA: ["IN"],
};

function normalizeToken(token: string): string {
  return token.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Expands a Target_Country value into the set of ISO codes it covers.
 * Returns null when the partner is unrestricted (blank or a wildcard), which
 * callers should treat as "serves everyone".
 */
export function expandTargetCountries(raw: string | null | undefined): Set<string> | null {
  if (!raw || !raw.trim()) return null; // unset — assume available everywhere

  // Split on every separator the sheet actually uses: comma, semicolon,
  // slash, pipe, ampersand, "and", plus whitespace runs.
  const tokens = raw
    .split(/[,;/|&+]|\band\b/i)
    .map((part) => normalizeToken(part))
    .filter(Boolean);

  if (tokens.length === 0) return null;

  const codes = new Set<string>();
  for (const token of tokens) {
    if (WILDCARDS.has(token)) return null; // one wildcard makes the whole row unrestricted
    const alias = ALIASES[token];
    if (alias) {
      alias.forEach((code) => codes.add(code));
      continue;
    }
    if (/^[A-Z]{2}$/.test(token)) codes.add(token); // already an ISO code
    // Anything unrecognised is ignored rather than treated as a restriction,
    // so a typo can never silently hide a partner from every visitor.
  }

  return codes.size > 0 ? codes : null;
}

/** True when the partner serves this visitor's country. */
export function servesCountry(
  targetCountries: string | null | undefined,
  country: string | null | undefined,
): boolean {
  const allowed = expandTargetCountries(targetCountries);
  if (!allowed) return true; // unrestricted
  if (!country) return true; // unknown visitor — never hide anything
  return allowed.has(country.toUpperCase());
}
