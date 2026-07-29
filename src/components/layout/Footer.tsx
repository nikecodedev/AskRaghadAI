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
      {/* Navigation and the update note share one line, the note at the far
          end. This only fits because the copyright moved down to the legal
          row — with all three here the links were squeezed until "Contact Us"
          wrapped alone onto a second line. */}
      <div
        className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-10"
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
        {!hideUpdateNote ? (
          <p className="luxury-note font-medium sm:text-end">
            {messages.footer.note}
          </p>
        ) : null}
      </div>

      {/* Legal links and the affiliate disclosure sit in their own row, below
          the main navigation. The disclosure has to be visible on every page
          rather than buried on the disclaimer page — that is the point of it. */}
      <div
        className="border-t border-[#ddd0b8]/40 px-4 py-6"
        style={{ direction: isAr ? "rtl" : "ltr" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          {/* Copyright shares this line with the legal links, sitting at the
              far end. justify-between rather than a margin so it lands on the
              correct side in both reading directions. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
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
            <p className="text-sm font-medium text-[#4f5f56]">
              © {new Date().getFullYear()} Askraghadai.com
            </p>
          </div>
          {/* No max-width: the disclosure is one sentence and should sit on a
              single line on desktop rather than wrapping early. */}
          <p className="text-sm leading-6 text-[#5f6d63]">
            {messages.footer.disclosure}
          </p>
        </div>
      </div>
    </footer>
  );
}
