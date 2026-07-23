"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useApp } from "@/components/providers/AppProviders";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { MobileNav } from "@/components/layout/MobileNav";

/**
 * Header layout (client requirement):
 * - English (LTR): hamburger + language on the LEFT, logo on the RIGHT
 * - Arabic (RTL): hamburger + language on the RIGHT, logo on the LEFT
 *
 * We do NOT branch on locale for positioning. The DOM order is fixed and the
 * page `dir` (rtl/ltr, set on <html>) flips the flex row automatically, so the
 * hamburger always sits on the correct side without one-off patches.
 * Logo mark only (no "Raghad AI" / "رغد AI" text).
 */
export function Header() {
  const { messages } = useApp();
  const pathname = usePathname();

  const homeBtn =
    pathname !== "/" ? (
      <Link
        href="/"
        aria-label={messages.nav.home}
        title={messages.nav.home}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd0b8]/60 bg-white/70 text-[#2c6e55] transition hover:border-[#c9a962]/60 hover:bg-white sm:h-10 sm:w-10"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 12l9-9 9 9M5 10v10h14V10"
          />
        </svg>
      </Link>
    ) : null;

  // Hamburger first, so it sits on the inline-start: LEFT in LTR (English),
  // RIGHT in RTL (Arabic) — flipped automatically by the page direction.
  const controls = (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <MobileNav />
      <LanguageToggle className="scale-90 sm:scale-100" />
    </div>
  );

  const logo = (
    <Link href="/" className="flex shrink-0 items-center" aria-label={messages.brand}>
      <BrandLogo size="sm" priority />
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[#ddd0b8]/50 bg-[#faf6ef]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {controls}
        <div className="flex items-center gap-2">
          {logo}
          {homeBtn}
        </div>
      </div>
    </header>
  );
}
