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
      <div
        className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10"
        style={{ direction: isAr ? "rtl" : "ltr" }}
      >
        <div className="flex flex-wrap gap-5 text-base font-semibold">
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
        <p className="text-base font-medium text-[#4f5f56]">
          © {new Date().getFullYear()} Askraghadai.com
        </p>
        {!hideUpdateNote ? (
          <p className="luxury-note font-medium">{messages.footer.note}</p>
        ) : null}
      </div>
    </footer>
  );
}
