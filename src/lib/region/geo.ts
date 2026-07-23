import type { Region } from "@/lib/i18n/types";

/** Map ISO country code → app region */
export function countryToRegion(countryCode: string | null | undefined): Region {
  const code = countryCode?.toUpperCase();
  if (!code) return "ksa";

  if (code === "SA") return "ksa";
  if (code === "EG") return "egypt";
  if (["AE", "BH", "KW", "OM", "QA"].includes(code)) return "gcc";

  // Broader Middle East / North Africa → GCC default
  if (["JO", "LB", "IQ", "YE", "SY", "PS", "MA", "TN", "DZ", "LY", "SD"].includes(code)) {
    return "gcc";
  }

  return "ksa";
}

export const REGION_MANUAL_KEY = "raghad-region-manual";
export const REGION_KEY = "raghad-region";
