"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/providers/AppProviders";

export function Footer() {
  const { messages, locale } = useApp();
  const pathname = usePathname();
  const isAr = locale === "ar";
  // Client feedback: About/Vision must not show a duplicated "content updated" note.
  const hideUpdateNote = pathname === "/about" || pathname === "/vision";

  return (
    <footer className="mt-auto border-t border-[#ddd0b8]/50 bg-[#faf6ef]">
      {/* Navigation gets its own line, with the copyright and update note on a
          second line beneath it. Previously all three sat in one justified row,
          which squeezed the links until "Contact Us" wrapped alone onto a
          second line while the note was crushed against the copyright. This
          also matches the legal row below, so the footer reads as one block. */}
      <div
        className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:py-10"
        style={{ direction: isAr ? "rtl" : "ltr" }}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-base font-semibold">
          <Link href="/" className="text-[#3d4f45] hover:text-[#2c6e55]">
            {messages.nav.home}
          </Link>
          <Link href="/about" className="text-[#3d4f45] hover:text-[#2c6e55]">
            {messages.nav.about}
          </Link>
          <Link href="/vision" className="text-[#3d4f45] hover:text-[#2c6e55]">
            {messages.nav.vision}
          </Link>
          <Link href="/chat" className="text-[#3d4f45] hover:text-[#2c6e55]">
            {messages.nav.chat}
          </Link>
          <Link href="/login" className="text-[#3d4f45] hover:text-[#2c6e55]">
            {messages.nav.account}
          </Link>
          <Link href="/contact" className="text-[#3d4f45] hover:text-[#2c6e55]">
            {messages.nav.contact}
          </Link>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <p className="text-base font-medium text-[#4f5f56]">
            © {new Date().getFullYear()} Askraghadai.com
          </p>
          {!hideUpdateNote ? (
            <p className="luxury-note max-w-xl font-medium">{messages.footer.note}</p>
          ) : null}
        </div>
      </div>

      {/* Legal links and the affiliate disclosure sit in their own row, below
          the main navigation. The disclosure has to be visible on every page
          rather than buried on the disclaimer page — that is the point of it. */}
      <div
        className="border-t border-[#ddd0b8]/40 px-4 py-6"
        style={{ direction: isAr ? "rtl" : "ltr" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex flex-wrap gap-5 text-sm font-semibold">
            <Link href="/disclaimer" className="text-[#3d4f45] hover:text-[#2c6e55]">
              {messages.footer.disclaimer}
            </Link>
            <Link href="/privacy" className="text-[#3d4f45] hover:text-[#2c6e55]">
              {messages.footer.privacy}
            </Link>
            <Link href="/terms" className="text-[#3d4f45] hover:text-[#2c6e55]">
              {messages.footer.terms}
            </Link>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-[#5f6d63]">
            {messages.footer.disclosure}
          </p>
        </div>
      </div>
    </footer>
  );
}
