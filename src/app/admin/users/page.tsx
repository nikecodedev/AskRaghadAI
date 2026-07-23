"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { messages, locale } = useApp();
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  }, []);

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">{messages.admin.users}</h1>
        <p className="mt-1 text-sm text-[#7a8b82]">{messages.admin.usersDesc}</p>

        {users.length === 0 ? (
          <p className="mt-8 text-sm text-[#7a8b82]">{messages.admin.noUsers}</p>
        ) : (
          <div className="mt-6 overflow-x-auto luxury-card">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-[#7a8b82]">
                  <th className="px-4 py-3 text-start">{messages.admin.userName}</th>
                  <th className="px-4 py-3 text-start">{messages.admin.userEmail}</th>
                  <th className="px-4 py-3 text-start">{messages.admin.userJoined}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 text-[#2c3e35]">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-[#2c3e35]" dir="ltr">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-[#7a8b82]">
                      {new Date(u.createdAt).toLocaleDateString(locale === "ar" ? "ar" : "en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
