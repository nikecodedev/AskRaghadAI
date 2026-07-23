"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo, BrandHeroLogo } from "@/components/brand/BrandLogo";
import { useApp } from "@/components/providers/AppProviders";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { MobileNav } from "@/components/layout/MobileNav";

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 shadow-[0_4px_20px_rgba(180,150,90,0.25)] ring-1 ring-[#d4c4a0]/50 transition hover:scale-105 hover:shadow-[0_6px_24px_rgba(180,150,90,0.4)] md:h-16 md:w-16"
    >
      {children}
    </button>
  );
}

export function LuxuryHome() {
  const { messages, locale, dir } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const isArabic = locale === "ar";

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(
      q
        ? `/chat?q=${encodeURIComponent(q)}&send=1&request=${Date.now()}`
        : "/chat",
    );
  };

  const goToChatAction = (action: "voice" | "camera" | "file") => {
    router.push(`/chat?action=${action}`);
  };

  // Hamburger first → sits inline-start: LEFT in LTR (English), RIGHT in RTL
  // (Arabic). Logo sits on the opposite side via justify-between.
  const controls = (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <MobileNav className="shrink-0" />
      <LanguageToggle className="scale-90 sm:scale-100" />
    </div>
  );

  const logo = (
    <Link href="/" className="flex shrink-0 items-center" aria-label={messages.brand}>
      <BrandLogo size="sm" priority />
    </Link>
  );

  return (
    <div className="relative overflow-hidden bg-[#f3ece0] text-[#2c3e35]" dir={dir}>
      <div
        aria-hidden
        className="pointer-events-none absolute -end-16 bottom-8 h-72 w-72 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none' stroke='%23b8965a' stroke-width='1.5'%3E%3Ccircle cx='50' cy='50' r='42'/%3E%3Cpath d='M50 8 L54 46 L50 50 L46 46 Z M50 92 L54 54 L50 50 L46 54 Z M8 50 L46 46 L50 50 L46 54 Z M92 50 L54 46 L50 50 L54 54 Z'/%3E%3Ccircle cx='50' cy='50' r='4' fill='%23b8965a'/%3E%3C/svg%3E")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        {controls}
        {logo}
      </header>

      <main className="relative z-10 mx-auto flex max-w-lg flex-col items-center px-6 pb-8 pt-28 sm:pt-12 md:max-w-2xl md:px-8 md:pt-14 lg:max-w-3xl lg:px-10">
        <div className="flex w-full flex-col items-center text-center">
          <div className="w-[12.5rem] sm:w-[14rem] md:w-[15rem]">
            <BrandHeroLogo locale={locale} priority />
          </div>

          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-wide text-[#1f4140] sm:text-5xl">
            {messages.brand}
          </h1>
          <p
            className={`${isArabic ? "hero-ar-tagline" : "hero-en-tagline"} mt-4 text-base font-semibold md:text-lg`}
          >
            {messages.hero.taglineShort}
          </p>
          <p className="hero-en-subtitle mt-4 max-w-lg md:text-lg">
            {messages.hero.subtitle}
          </p>
          <p className="luxury-muted mt-4 font-serif tracking-[0.14em] md:text-base">
            {messages.hero.domain}
          </p>
        </div>

        <form
          onSubmit={submitSearch}
          className="mt-10 w-full max-w-md md:max-w-xl lg:max-w-2xl"
        >
          <div className="relative overflow-hidden rounded-full bg-gradient-to-b from-[#e8dcc4] via-[#dccfb0] to-[#c9b88a] p-[2px] shadow-[0_8px_32px_rgba(180,150,90,0.35)]">
            <div className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#f5eedf] to-[#ebe0cc] py-2 pe-2 ps-5 md:py-3 md:ps-6">
              <svg
                className="h-5 w-5 shrink-0 text-[#8a7550] md:h-6 md:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={messages.hero.searchPlaceholder}
                className="w-full bg-transparent text-base font-medium text-[#3d4f45] outline-none placeholder:text-[#5f6d63] sm:text-lg"
                dir={dir}
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-5 py-2.5 text-base font-semibold text-white shadow-[0_2px_10px_rgba(31,82,64,0.4)] transition hover:from-[#337d61] hover:to-[#24614b] md:px-6 md:py-3"
              >
                {messages.hero.searchButton}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-5 flex items-center gap-7 md:mt-7 md:gap-9">
          <ActionButton label={messages.hero.voice} onClick={() => goToChatAction("voice")}>
            <svg className="h-6 w-6 text-[#2c6e55]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"
              />
            </svg>
          </ActionButton>
          <ActionButton label={messages.hero.camera} onClick={() => goToChatAction("camera")}>
            <svg className="h-6 w-6 text-[#2c6e55]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </ActionButton>
          <ActionButton label={messages.hero.file} onClick={() => goToChatAction("file")}>
            <svg className="h-6 w-6 text-[#2c6e55]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </ActionButton>
        </div>
      </main>
    </div>
  );
}
