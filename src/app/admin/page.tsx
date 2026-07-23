"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

export default function AdminPage() {
  const { messages } = useApp();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => setAllowed(r.ok))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return (
      <AppShell>
        <div className="luxury-page flex min-h-[40vh] items-center justify-center text-sm text-[#7a8b82]">
          {messages.admin.loading}
        </div>
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell>
        <div className="luxury-page mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-[#7a8b82]">{messages.admin.unauthorized}</p>
          <Link href="/dashboard" className="luxury-btn mt-4 inline-flex">
            {messages.nav.dashboard}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-serif text-2xl tracking-wide text-[#2c3e35]">{messages.admin.title}</h1>
        <p className="mt-2 text-sm text-[#7a8b82]">{messages.admin.subtitle}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/products" className="luxury-card block p-6 transition hover:shadow-md">
            <h2 className="font-semibold text-[#2c3e35]">{messages.admin.products}</h2>
            <p className="mt-2 text-sm text-[#7a8b82]">{messages.admin.productsDesc}</p>
          </Link>
          <Link href="/admin/category-cards" className="luxury-card block p-6 transition hover:shadow-md">
            <h2 className="font-semibold text-[#2c3e35]">{messages.admin.categoryCards}</h2>
            <p className="mt-2 text-sm text-[#7a8b82]">{messages.admin.categoryCardsDesc}</p>
          </Link>
          <Link href="/admin/knowledge" className="luxury-card block p-6 transition hover:shadow-md">
            <h2 className="font-semibold text-[#2c3e35]">{messages.admin.knowledge}</h2>
            <p className="mt-2 text-sm text-[#7a8b82]">{messages.admin.knowledgeDesc}</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
