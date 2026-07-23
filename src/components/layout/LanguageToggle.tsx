"use client";

import { useApp } from "@/components/providers/AppProviders";
import type { Locale } from "@/lib/i18n/types";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, messages } = useApp();

  return (
    <div
      role="group"
      aria-label={messages.settings.language}
      className={`flex rounded-full border border-[#c9a962]/50 bg-white/70 p-0.5 shadow-sm backdrop-blur ${className}`}
    >
      {(["ar", "en"] as Locale[]).map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            aria-pressed={active}
            aria-label={loc === "ar" ? "العربية" : "English"}
            className={`min-w-[2.75rem] rounded-full px-3 py-2 text-sm font-bold transition ${
                active
                  ? "bg-[#2c6e55] text-white shadow-md ring-2 ring-[#c9a962]/70 ring-offset-1"
                  : "text-[#4f5f56] hover:bg-[#f3ece0]"
              }`}
          >
            {loc === "ar" ? "ع" : "EN"}
          </button>
        );
      })}
    </div>
  );
}
