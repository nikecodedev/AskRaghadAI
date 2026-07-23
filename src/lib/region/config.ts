import type { Region } from "@/lib/i18n/types";

export const REGION_CONFIG: Record<
  Region,
  { currency: string; currencySymbol: string; dialectHint: string }
> = {
  ksa: {
    currency: "SAR",
    currencySymbol: "ر.س",
    dialectHint: "saudi",
  },
  gcc: {
    currency: "AED",
    currencySymbol: "د.إ",
    dialectHint: "gulf",
  },
  egypt: {
    currency: "EGP",
    currencySymbol: "ج.م",
    dialectHint: "egyptian",
  },
};
