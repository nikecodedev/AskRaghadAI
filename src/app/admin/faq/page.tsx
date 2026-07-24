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

function parseFaqContent(content: string) {
  const qMatch = /^Q:\s*(.*)$/m.exec(content);
  const enMatch = /^A \(English\):\s*(.*)$/m.exec(content);
  const arMatch = /^A \(Arabic\):\s*(.*)$/m.exec(content);
  return {
    question: qMatch?.[1] ?? "",
    answerEn: enMatch?.[1] ?? "",
    answerAr: arMatch?.[1] ?? "",
  };
}

function buildFaqContent(question: string, answerEn: string, answerAr: string) {
  return [
    `Q: ${question}`,
    answerEn ? `A (English): ${answerEn}` : null,
    answerAr ? `A (Arabic): ${answerAr}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function AdminFaqPage() {
  const { messages } = useApp();
  const [faqs, setFaqs] = useState<Doc[]>([]);
  const [question, setQuestion] = useState("");
  const [answerEn, setAnswerEn] = useState("");
  const [answerAr, setAnswerAr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    fetch("/api/admin/knowledge")
      .then((r) => r.json())
      .then((d) => setFaqs((d.documents ?? []).filter((doc: Doc) => doc.category === "faq")))
      .catch(() => setFaqs([]));
  };

  useEffect(load, []);

  const resetForm = () => {
    setEditingId(null);
    setQuestion("");
    setAnswerEn("");
    setAnswerAr("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || (!answerEn.trim() && !answerAr.trim())) return;

    const content = buildFaqContent(question, answerEn, answerAr);

    if (editingId) {
      await fetch(`/api/admin/knowledge/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: question, content }),
      });
    } else {
      await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: question, content, category: "faq" }),
      });
    }

    resetForm();
    load();
  };

  const startEdit = async (id: string) => {
    const res = await fetch(`/api/admin/knowledge/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    const parsed = parseFaqContent(data.document.content ?? "");
    setEditingId(id);
    setQuestion(parsed.question || data.document.title);
    setAnswerEn(parsed.answerEn);
    setAnswerAr(parsed.answerAr);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
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
          <div className="flex gap-3">
            <button type="submit" className="luxury-btn">
              {editingId ? messages.admin.saveCard : messages.admin.addFaq}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-[#7a8b82] hover:underline">
                {messages.admin.cancelEdit}
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={syncToKnowledge} disabled={syncing} className="luxury-btn">
            {syncing ? messages.admin.indexing : messages.admin.syncToKnowledge}
          </button>
          {syncMessage && <p className="text-sm text-[#2c6e55]">{syncMessage}</p>}
        </div>

        <ul className="mt-8 space-y-3">
          {faqs.map((f) => (
            <li key={f.id} className="luxury-card flex items-center justify-between gap-4 p-4">
              <p className="font-medium text-[#2c3e35]">{f.title}</p>
              <div className="flex shrink-0 gap-4">
                <button
                  type="button"
                  onClick={() => startEdit(f.id)}
                  className="text-sm text-[#2c6e55] hover:underline"
                >
                  {messages.admin.edit}
                </button>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  {messages.admin.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
