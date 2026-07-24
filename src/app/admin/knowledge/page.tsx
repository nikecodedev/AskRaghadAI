"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";
import { CATEGORIES } from "@/lib/categories";

type Doc = {
  id: string;
  title: string;
  filename: string;
  category: string | null;
  status: string;
  _count: { chunks: number };
};

export default function AdminKnowledgePage() {
  const { messages, locale } = useApp();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("fashion");
  const [status, setStatus] = useState("");

  const load = () => {
    fetch("/api/admin/knowledge")
      .then((r) => r.json())
      .then((d) => setDocuments(d.documents ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category, filename: `${title}.txt` }),
    });
    if (!res.ok) {
      setStatus(messages.admin.saveFailed);
      return;
    }
    setTitle("");
    setContent("");
    setStatus(messages.admin.uploaded);
    load();
  };

  const reindex = async () => {
    setStatus(messages.admin.indexing);
    const res = await fetch("/api/admin/knowledge", { method: "PUT" });
    const data = await res.json();
    setStatus(res.ok ? messages.admin.indexDone : data.error ?? messages.admin.saveFailed);
    load();
  };

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">{messages.admin.knowledge}</h1>

        <form onSubmit={upload} className="mt-6 luxury-card space-y-3 p-6">
          <input
            placeholder={messages.admin.docTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="luxury-input"
            required
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="luxury-input"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "ar" ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
          <textarea
            placeholder={messages.admin.docContent}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="luxury-input min-h-[120px]"
            required
          />
          <button type="submit" className="luxury-btn">
            {messages.admin.uploadDoc}
          </button>
        </form>

        <button type="button" onClick={reindex} className="luxury-btn mt-4">
          {messages.admin.reindex}
        </button>

        {status && <p className="mt-3 text-sm text-[#2c6e55]">{status}</p>}

        <ul className="mt-8 space-y-3">
          {documents.map((d) => (
            <li key={d.id} className="luxury-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-[#2c3e35]">{d.title}</p>
                <p className="text-xs text-[#7a8b82]">
                  {d.status} · {d._count.chunks} chunks · {d.category}
                </p>
              </div>
              <a
                href={`/api/admin/knowledge/${d.id}?download=1`}
                className="shrink-0 text-sm text-[#2c6e55] hover:underline"
              >
                {messages.admin.download}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
