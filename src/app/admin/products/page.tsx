"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";
import { CATEGORIES } from "@/lib/categories";

type Product = {
  id: string;
  category: string;
  nameEn: string;
  nameAr: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  active: boolean;
};

const emptyForm = {
  category: "fashion",
  nameEn: "",
  nameAr: "",
  price: "",
  currency: "SAR",
  imageUrl: "",
};

export default function AdminProductsPage() {
  const { messages, locale } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState<"pull" | "push" | null>(null);
  const [syncMessage, setSyncMessage] = useState("");

  const load = () => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setError(messages.admin.unauthorized));
  };

  useEffect(() => {
    load();
  }, [messages.admin.unauthorized]);

  const runSync = async (direction: "pull" | "push") => {
    setSyncing(direction);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/sheets-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data.error || messages.admin.syncFailed);
        return;
      }
      setSyncMessage(messages.admin.syncDone);
      load();
    } catch {
      setSyncMessage(messages.admin.syncFailed);
    } finally {
      setSyncing(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: form.price ? Number(form.price) : null,
      }),
    });
    if (!res.ok) {
      setError(messages.admin.saveFailed);
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    load();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      category: p.category,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      price: p.price != null ? String(p.price) : "",
      currency: p.currency,
      imageUrl: p.imageUrl ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (editingId === id) cancelEdit();
    load();
  };

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">{messages.admin.products}</h1>

        <section className="mt-6 luxury-card p-6">
          <h2 className="font-medium text-[#2c3e35]">{messages.admin.sheetSync}</h2>
          <p className="mt-1 text-sm text-[#7a8b82]">{messages.admin.sheetSyncDesc}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runSync("pull")}
              disabled={syncing !== null}
              className="luxury-btn"
            >
              {syncing === "pull" ? messages.admin.syncing : messages.admin.pullFromSheet}
            </button>
            <button
              type="button"
              onClick={() => runSync("push")}
              disabled={syncing !== null}
              className="luxury-btn"
            >
              {syncing === "push" ? messages.admin.syncing : messages.admin.pushToSheet}
            </button>
          </div>
          {syncMessage && <p className="mt-3 text-sm text-[#2c6e55]">{syncMessage}</p>}
        </section>

        <p className="mt-6 text-xs text-[#7a8b82]">{messages.admin.affiliateManagedInSheet}</p>

        <form onSubmit={submit} className="mt-6 luxury-card space-y-3 p-6">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="luxury-input"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "ar" ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
          <input
            placeholder={messages.admin.nameEn}
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            className="luxury-input"
            required
          />
          <input
            placeholder={messages.admin.nameAr}
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            className="luxury-input"
            required
          />
          <div className="flex gap-2">
            <input
              placeholder={messages.admin.price}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="luxury-input"
              type="number"
            />
            <input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="luxury-input !w-24"
            />
          </div>
          <input
            placeholder={messages.admin.imageUrl}
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="luxury-input"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="luxury-btn">
              {editingId ? messages.admin.saveCard : messages.admin.addProduct}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-sm text-[#7a8b82] hover:underline">
                {messages.admin.cancelEdit}
              </button>
            )}
          </div>
        </form>

        <ul className="mt-8 space-y-3">
          {products.map((p) => (
            <li key={p.id} className="luxury-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-[#2c3e35]">
                  {locale === "ar" ? p.nameAr : p.nameEn}
                </p>
                <p className="text-xs text-[#7a8b82]">
                  {p.category}
                  {p.price != null ? ` · ${p.price} ${p.currency}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-4">
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="text-sm text-[#2c6e55] hover:underline"
                >
                  {messages.admin.edit}
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
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
