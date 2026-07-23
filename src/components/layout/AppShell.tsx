"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useApp } from "@/components/providers/AppProviders";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { dir } = useApp();
  const pathname = usePathname();
  const hideFooter = pathname === "/chat" || pathname.startsWith("/chat/");

  return (
    <>
      <Header />
      <main className={`flex-1 ${hideFooter ? "pb-[env(safe-area-inset-bottom)]" : ""}`} dir={dir}>
        {children}
      </main>
      {!hideFooter ? <Footer /> : null}
    </>
  );
}
