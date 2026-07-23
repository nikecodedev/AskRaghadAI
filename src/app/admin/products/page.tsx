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
  affiliateUrl: string | null;
  discountCode: string | null;
  imageUrl: string | null;
  active: boolean;
};

const emptyForm = {
  category: "fashion",
  nameEn: "",
  nameAr: "",
  price: "",
  currency: "SAR",
  affiliateUrl: "",
  discountCode: "",
  imageUrl: "",
};

export default function AdminProductsPage() {
  const { messages, locale } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setError(messages.admin.unauthorized));
  };

  useEffect(() => {
    load();
  }, [messages.admin.unauthorized]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/products", {
      method: "POST",
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
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-4xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">{messages.admin.products}</h1>

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
            placeholder={messages.admin.affiliateUrl}
            value={form.affiliateUrl}
            onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
            className="luxury-input"
          />
          <input
            placeholder={messages.admin.discountCode}
            value={form.discountCode}
            onChange={(e) => setForm({ ...form, discountCode: e.target.value })}
            className="luxury-input"
          />
          <input
            placeholder={messages.admin.imageUrl}
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="luxury-input"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="luxury-btn">
            {messages.admin.addProduct}
          </button>
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
                  {p.discountCode ? ` · ${p.discountCode}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="text-sm text-red-600 hover:underline"
              >
                {messages.admin.delete}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
