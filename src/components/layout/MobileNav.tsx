"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/components/providers/AppProviders";
import { useAuth } from "@/components/providers/AuthProvider";
import { BrandLogo } from "@/components/brand/BrandLogo";

type NavItem = { href: string; label: string; show?: boolean };

/**
 * Single navigation drawer for mobile AND desktop (PC = phone, client request).
 *
 * Client-approved menu:
 *   Home → AI Chat → About Us → Our Vision → Contact Us → Account
 * Account opens the unified Sign In / Register tabbed page.
 * Header: logo mark + "Raghad AI" wordmark (annotated "add" on mock).
 * Drawer side: English LEFT, Arabic RIGHT.
 * Settings / Country-Region / Currency / Language-in-drawer: removed.
 * Language stays in the page header toggle; region stays IP-based.
 */
export function MobileNav({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { messages, locale } = useApp();
  const { user, logout } = useAuth();
  const isAr = locale === "ar";

  const items: NavItem[] = [
    { href: "/", label: messages.nav.home },
    { href: "/chat", label: messages.nav.chat },
    { href: "/about", label: messages.nav.about },
    { href: "/vision", label: messages.nav.vision },
    { href: "/contact", label: messages.nav.contact },
    { href: "/login", label: messages.nav.account, show: !user },
    { href: "/dashboard", label: messages.nav.dashboard, show: Boolean(user) },
    { href: "/admin", label: messages.nav.admin, show: Boolean(user?.isAdmin) },
  ];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const drawerSide = isAr ? "right-0" : "left-0";

  const drawer = open && mounted ? (
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <aside
          className={`fixed inset-y-0 ${drawerSide} z-[210] flex w-[min(100%,20rem)] flex-col bg-[#faf6ef] shadow-2xl ring-1 ring-[#c9a962]/20`}
          style={{ direction: isAr ? "rtl" : "ltr" }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#ddd0b8]/50 px-5 py-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex min-w-0 items-center gap-3"
              aria-label={messages.brand}
            >
              <BrandLogo size="sm" />
              {/* Client mock: add "Raghad AI" wordmark next to the mark in the drawer only */}
              <span className="truncate font-serif text-xl font-semibold tracking-wide text-[#24332c]">
                {messages.brand}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={messages.nav.close}
              className="shrink-0 rounded-full p-2 text-[#7a8b82] transition hover:bg-[#f3ece0] hover:text-[#2c3e35]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeWidth={1.8} d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
            {items
              .filter((item) => item.show !== false)
              .map((item) => {
                const pathOnly = item.href.split("?")[0];
                const active =
                  pathOnly === "/"
                    ? pathname === "/"
                    : pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-4 py-3.5 text-base tracking-wide transition ${
                      active
                        ? "bg-[#2c6e55]/12 font-semibold text-[#1f5240]"
                        : "font-semibold text-[#3d4f45] hover:bg-[#f3ece0] hover:text-[#24332c]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

            {user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="mt-1 block w-full rounded-xl px-4 py-3.5 text-start text-base font-medium text-[#3d4f45] transition hover:bg-[#f3ece0]"
              >
                {messages.nav.logout}
              </button>
            ) : null}
          </nav>
        </aside>
      </>,
      document.body
    )
  ) : null;

  return (
    <div className={className}>
      <button
        type="button"
        aria-label={messages.nav.menu}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center gap-1.5 rounded-lg p-2 transition hover:bg-[#f3ece0]"
      >
        <span
          className={`h-0.5 w-6 origin-center bg-[#c9a962] transition ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span className={`h-0.5 w-6 bg-[#c9a962] transition ${open ? "opacity-0" : ""}`} />
        <span
          className={`h-0.5 w-6 origin-center bg-[#c9a962] transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>
      {drawer}
    </div>
  );
}
