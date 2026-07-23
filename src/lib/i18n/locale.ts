import type { Locale } from "./types";

export const LOCALE_COOKIE = "raghad-locale";
export const LOCALE_STORAGE_KEY = "raghad-locale";
export const DEFAULT_LOCALE: Locale = "ar";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "ar" || value === "en";
}

export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function dirFromLocale(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Persist locale for SSR on the next request. */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
}
