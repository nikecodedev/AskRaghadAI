"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getMessagesSync } from "@/lib/i18n/get-messages";
import {
  LOCALE_STORAGE_KEY,
  dirFromLocale,
  isLocale,
  setLocaleCookie,
} from "@/lib/i18n/locale";
import type { Locale, Messages, Region } from "@/lib/i18n/types";
import { REGION_CONFIG } from "@/lib/region/config";
import { REGION_KEY, REGION_MANUAL_KEY } from "@/lib/region/geo";

type AppContextValue = {
  locale: Locale;
  region: Region;
  messages: Messages;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  setRegion: (region: Region) => void;
  regionConfig: (typeof REGION_CONFIG)[Region];
};

const AppContext = createContext<AppContextValue | null>(null);

function applySettingOverrides(
  messages: Messages,
  locale: Locale,
  overrides: Record<string, string>,
): Messages {
  const val = (key: string) => overrides[`${key}.${locale}`];
  const next = structuredClone(messages);

  if (val("hero.title")) next.hero.taglineShort = val("hero.title")!;
  if (val("hero.subtitle")) next.hero.subtitle = val("hero.subtitle")!;
  if (val("about.subtitle")) next.about.subtitle = val("about.subtitle")!;
  if (val("about.introBody")) next.about.introBody = val("about.introBody")!;
  if (val("about.missionBody")) next.about.missionBody = val("about.missionBody")!;
  if (val("vision.subtitle")) next.vision.subtitle = val("vision.subtitle")!;
  if (val("vision.leadBody")) next.vision.leadBody = val("vision.leadBody")!;
  if (val("contact.subtitle")) next.contact.subtitle = val("contact.subtitle")!;
  if (overrides["support.email"]) next.contact.supportEmail = overrides["support.email"];

  return next;
}

function applyDocumentDirection(locale: Locale) {
  const dir = dirFromLocale(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

async function persistLocaleServer(locale: Locale) {
  await fetch("/api/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
}

export function AppProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const router = useRouter();
  const syncedOnMount = useRef(false);
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [region, setRegionState] = useState<Region>("ksa");
  const [messages, setMessages] = useState<Messages>(() =>
    getMessagesSync(initialLocale),
  );

  useEffect(() => {
    if (syncedOnMount.current) return;
    syncedOnMount.current = true;

    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    const savedRegion = localStorage.getItem(REGION_KEY) as Region | null;
    const effectiveLocale = isLocale(savedLocale) ? savedLocale : initialLocale;

    localStorage.setItem(LOCALE_STORAGE_KEY, effectiveLocale);
    setLocaleCookie(effectiveLocale);
    applyDocumentDirection(effectiveLocale);

    if (effectiveLocale !== initialLocale) {
      setLocaleState(effectiveLocale);
      void persistLocaleServer(effectiveLocale).then(() => router.refresh());
    }

    if (savedRegion && savedRegion in REGION_CONFIG) {
      setRegionState(savedRegion);
    }
  }, [initialLocale, router]);

  useEffect(() => {
    if (localStorage.getItem(REGION_MANUAL_KEY)) return;
    if (localStorage.getItem(REGION_KEY)) return;

    fetch("/api/geo")
      .then((r) => r.json())
      .then((data: { region?: Region }) => {
        if (data.region && data.region in REGION_CONFIG) {
          setRegionState(data.region);
          localStorage.setItem(REGION_KEY, data.region);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const base = getMessagesSync(locale);
    setMessages(base);
    applyDocumentDirection(locale);

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { settings?: Record<string, string> }) => {
        const overrides = data.settings ?? {};
        if (Object.keys(overrides).length === 0) return;
        setMessages((prev) => applySettingOverrides(prev, locale, overrides));
      })
      .catch(() => {});
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      setLocaleCookie(next);
      applyDocumentDirection(next);
      void persistLocaleServer(next).then(() => router.refresh());
    },
    [router]
  );

  const setRegion = useCallback((next: Region) => {
    setRegionState(next);
    localStorage.setItem(REGION_KEY, next);
    localStorage.setItem(REGION_MANUAL_KEY, "1");
  }, []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!messages) return null;
    return {
      locale,
      region,
      messages,
      dir: dirFromLocale(locale),
      setLocale,
      setRegion,
      regionConfig: REGION_CONFIG[region],
    };
  }, [locale, region, messages, setLocale, setRegion]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3ece0]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a962] border-t-transparent" />
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProviders");
  return ctx;
}
