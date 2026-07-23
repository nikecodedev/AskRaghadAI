"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

type Doc = {
  id: string;
  title: string;
  category: string | null;
  updatedAt: string;
};

export default function AdminFaqPage() {
  const { messages } = useApp();
  const [faqs, setFaqs] = useState<Doc[]>([]);
  const [question, setQuestion] = useState("");
  const [answerEn, setAnswerEn] = useState("");
  const [answerAr, setAnswerAr] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    fetch("/api/admin/knowledge")
      .then((r) => r.json())
      .then((d) => setFaqs((d.documents ?? []).filter((doc: Doc) => doc.category === "faq")))
      .catch(() => setFaqs([]));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || (!answerEn.trim() && !answerAr.trim())) return;

    const content = [
      `Q: ${question}`,
      answerEn ? `A (English): ${answerEn}` : null,
      answerAr ? `A (Arabic): ${answerAr}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: question, content, category: "faq" }),
    });

    setQuestion("");
    setAnswerEn("");
    setAnswerAr("");
    load();
  };

  const syncToKnowledge = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/knowledge", { method: "PUT" });
      const data = await res.json();
      setSyncMessage(res.ok ? messages.admin.indexDone : data.error || messages.admin.syncFailed);
    } catch {
      setSyncMessage(messages.admin.syncFailed);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-3xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">{messages.admin.faq}</h1>
        <p className="mt-1 text-sm text-[#7a8b82]">{messages.admin.faqDesc}</p>

        <form onSubmit={submit} className="mt-6 luxury-card space-y-3 p-6">
          <input
            placeholder={messages.admin.faqQuestion}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="luxury-input"
            required
          />
          <textarea
            placeholder={messages.admin.faqAnswerEn}
            value={answerEn}
            onChange={(e) => setAnswerEn(e.target.value)}
            className="luxury-input min-h-[80px]"
            dir="ltr"
          />
          <textarea
            placeholder={messages.admin.faqAnswerAr}
            value={answerAr}
            onChange={(e) => setAnswerAr(e.target.value)}
            className="luxury-input min-h-[80px]"
            dir="rtl"
          />
          <button type="submit" className="luxury-btn">
            {messages.admin.addFaq}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={syncToKnowledge} disabled={syncing} className="luxury-btn">
            {syncing ? messages.admin.indexing : messages.admin.syncToKnowledge}
          </button>
          {syncMessage && <p className="text-sm text-[#2c6e55]">{syncMessage}</p>}
        </div>

        <ul className="mt-8 space-y-3">
          {faqs.map((f) => (
            <li key={f.id} className="luxury-card p-4">
              <p className="font-medium text-[#2c3e35]">{f.title}</p>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
