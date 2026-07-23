"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

type ContactRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

export default function AdminContactInboxPage() {
  const { messages, locale } = useApp();
  const [rows, setRows] = useState<ContactRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/contact-messages")
      .then((r) => r.json())
      .then((d) => setRows(d.messages ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-3xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">{messages.admin.contactInbox}</h1>
        <p className="mt-1 text-sm text-[#7a8b82]">{messages.admin.contactInboxDesc}</p>

        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-[#7a8b82]">{messages.admin.noMessages}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((m) => (
              <li key={m.id} className="luxury-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-[#2c3e35]">{m.name}</p>
                  <p className="text-xs text-[#7a8b82]">
                    {new Date(m.createdAt).toLocaleString(locale === "ar" ? "ar" : "en-US")}
                  </p>
                </div>
                <p className="text-sm text-[#2c6e55]" dir="ltr">
                  {m.email}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-[#2c3e35]">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
