"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

type Stats = {
  users: number;
  products: number;
  messages: number;
  categoryCards: number;
  lastSyncAt: string | null;
};

export default function AdminPage() {
  const { messages, locale } = useApp();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const loadStats = () => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d));
  };

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => {
        setAllowed(r.ok);
        if (r.ok) loadStats();
      })
      .catch(() => setAllowed(false));
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/sheets-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "pull" }),
      });
      const data = await res.json();
      setSyncMessage(res.ok ? messages.admin.syncDone : data.error || messages.admin.syncFailed);
      if (res.ok) loadStats();
    } catch {
      setSyncMessage(messages.admin.syncFailed);
    } finally {
      setSyncing(false);
    }
  };

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

  const sections = [
    { href: "/admin/products", title: messages.admin.products, desc: messages.admin.productsDesc },
    { href: "/admin/category-cards", title: messages.admin.categoryCards, desc: messages.admin.categoryCardsDesc },
    { href: "/admin/content", title: messages.admin.content, desc: messages.admin.contentDesc },
    { href: "/admin/knowledge", title: messages.admin.knowledge, desc: messages.admin.knowledgeDesc },
    { href: "/admin/faq", title: messages.admin.faq, desc: messages.admin.faqDesc },
    { href: "/admin/users", title: messages.admin.users, desc: messages.admin.usersDesc },
    { href: "/admin/contact", title: messages.admin.contactInbox, desc: messages.admin.contactInboxDesc },
  ];

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl tracking-wide text-[#2c3e35]">{messages.admin.title}</h1>
            <p className="mt-2 text-sm text-[#7a8b82]">{messages.admin.subtitle}</p>
          </div>
          <div className="text-end">
            <button type="button" onClick={syncNow} disabled={syncing} className="luxury-btn">
              {syncing ? messages.admin.syncing : messages.admin.syncNow}
            </button>
            {syncMessage && <p className="mt-2 text-xs text-[#2c6e55]">{syncMessage}</p>}
          </div>
        </div>

        {stats && (
          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[#7a8b82]">
              {messages.admin.overview}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={messages.admin.statUsers} value={stats.users} />
              <StatCard label={messages.admin.statProducts} value={stats.products} />
              <StatCard label={messages.admin.statMessages} value={stats.messages} />
              <StatCard label={messages.admin.statCategories} value={stats.categoryCards} />
            </div>
            {stats.lastSyncAt && (
              <p className="mt-2 text-xs text-[#7a8b82]">
                {new Date(stats.lastSyncAt).toLocaleString(locale === "ar" ? "ar" : "en-US")}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="luxury-card block p-6 transition hover:shadow-md">
              <h2 className="font-semibold text-[#2c3e35]">{s.title}</h2>
              <p className="mt-2 text-sm text-[#7a8b82]">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="luxury-card p-4 text-center">
      <p className="text-2xl font-semibold text-[#2c3e35]">{value}</p>
      <p className="mt-1 text-xs text-[#7a8b82]">{label}</p>
    </div>
  );
}
