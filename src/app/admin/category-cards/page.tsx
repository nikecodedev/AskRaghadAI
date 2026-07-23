"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

type CategoryCard = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  link: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

const emptyForm = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  link: "/chat",
  imageUrl: "",
  sortOrder: "",
};

export default function AdminCategoryCardsPage() {
  const { messages, locale } = useApp();
  const [cards, setCards] = useState<CategoryCard[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/admin/category-cards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => setError(messages.admin.unauthorized));
  };

  useEffect(() => {
    load();
  }, [messages.admin.unauthorized]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload = {
      ...form,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    };

    const res = await fetch(
      editingId ? `/api/admin/category-cards/${editingId}` : "/api/admin/category-cards",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      setError(messages.admin.saveFailed);
      return;
    }

    resetForm();
    load();
  };

  const startEdit = (card: CategoryCard) => {
    setEditingId(card.id);
    setForm({
      titleEn: card.titleEn,
      titleAr: card.titleAr,
      descriptionEn: card.descriptionEn,
      descriptionAr: card.descriptionAr,
      link: card.link,
      imageUrl: card.imageUrl,
      sortOrder: String(card.sortOrder),
    });
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/category-cards/${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    load();
  };

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">
          {messages.admin.categoryCards}
        </h1>
        <p className="mt-2 text-sm text-[#7a8b82]">{messages.admin.categoryCardsDesc}</p>

        <form onSubmit={submit} className="mt-6 luxury-card space-y-3 p-6">
          <input
            placeholder={messages.admin.nameEn}
            value={form.titleEn}
            onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
            className="luxury-input"
            required
          />
          <input
            placeholder={messages.admin.nameAr}
            value={form.titleAr}
            onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
            className="luxury-input"
            required
          />
          <textarea
            placeholder={messages.admin.descriptionEn}
            value={form.descriptionEn}
            onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            className="luxury-input min-h-[80px]"
            required
          />
          <textarea
            placeholder={messages.admin.descriptionAr}
            value={form.descriptionAr}
            onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
            className="luxury-input min-h-[80px]"
            required
          />
          <input
            placeholder={messages.admin.cardLink}
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            className="luxury-input"
            required
          />
          <input
            placeholder={messages.admin.imageUrl}
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="luxury-input"
            required
          />
          <input
            placeholder={messages.admin.sortOrder}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            className="luxury-input"
            type="number"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="luxury-btn">
              {editingId ? messages.admin.saveCard : messages.admin.addCard}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="luxury-btn-secondary">
                {messages.admin.cancelEdit}
              </button>
            ) : null}
          </div>
        </form>

        <ul className="mt-8 space-y-3">
          {cards.map((card) => (
            <li key={card.id} className="luxury-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.imageUrl}
                alt={locale === "ar" ? card.titleAr : card.titleEn}
                className="h-24 w-full rounded-xl object-cover sm:h-20 sm:w-28"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#2c3e35]">
                  {locale === "ar" ? card.titleAr : card.titleEn}
                </p>
                <p className="mt-1 truncate text-sm text-[#7a8b82]">{card.link}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(card)}
                  className="rounded-full border border-[#c9a962]/50 px-3 py-1.5 text-sm text-[#2c6e55]"
                >
                  {messages.admin.edit}
                </button>
                <button
                  type="button"
                  onClick={() => remove(card.id)}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600"
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
