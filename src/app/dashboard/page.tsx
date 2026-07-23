"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { useApp } from "@/components/providers/AppProviders";
import { useAuth } from "@/components/providers/AuthProvider";

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
};

export default function DashboardPage() {
  const { messages, dir } = useApp();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setConversations(data.conversations ?? []);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="luxury-page flex min-h-[40vh] items-center justify-center luxury-muted">
          {messages.dashboard.loading}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-12 sm:py-14" dir={dir}>
        <h1 className="luxury-heading-page">{messages.dashboard.title}</h1>
        <p className="mt-3 text-base font-medium text-[#2c6e55]">
          {messages.dashboard.welcome}, {user.name ?? user.email}
        </p>

        <section className="luxury-card mt-8 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#24332c]">{messages.dashboard.conversations}</h2>

          {fetching ? (
            <p className="luxury-muted mt-5">{messages.dashboard.loading}</p>
          ) : conversations.length === 0 ? (
            <>
              <p className="luxury-muted mt-5">{messages.dashboard.empty}</p>
              <Link href="/chat" className="luxury-btn mt-4 inline-flex">
                {messages.hero.cta}
              </Link>
            </>
          ) : (
            <ul className="mt-5 space-y-3">
              {conversations.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-[#ddd0b8]/60 bg-white/80 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#24332c]">{c.title}</p>
                      {c.preview && (
                        <p className="luxury-muted mt-1.5 line-clamp-2 text-sm leading-6">{c.preview}</p>
                      )}
                    </div>
                    <span className="luxury-note shrink-0">
                      {c.messageCount} {messages.dashboard.messages}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!fetching && conversations.length > 0 && (
            <Link href="/chat" className="mt-5 inline-flex text-base font-medium text-[#2c6e55] hover:underline">
              {messages.hero.cta}
            </Link>
          )}
        </section>

        <ChangePasswordForm />

        {user.isAdmin && (
          <section className="luxury-card mt-6 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-[#24332c]">{messages.admin.title}</h2>
            <p className="luxury-muted mt-3">{messages.admin.subtitle}</p>
            <Link href="/admin" className="luxury-btn mt-4 inline-flex">
              {messages.nav.admin}
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
