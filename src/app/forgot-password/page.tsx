"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

export default function ForgotPasswordPage() {
  const { messages, locale, dir } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? messages.auth.requestFailed);
        return;
      }
      setSent(true);
    } catch {
      setError(messages.auth.requestFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="luxury-page mx-auto w-full max-w-lg px-4 py-12 sm:py-16" dir={dir}>
        <div className="text-center">
          <p className="luxury-overline">{messages.brand}</p>
          <h1 className="luxury-heading-page mt-3">{messages.auth.forgotTitle}</h1>
          <p className="mt-3 text-sm text-[#5f6d63]">{messages.auth.forgotSubtitle}</p>
        </div>

        <div className="luxury-card mt-8 p-6 sm:p-7">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium text-[#2c3e35]">{messages.auth.resetEmailSent}</p>
              <Link href="/login" className="luxury-btn inline-flex">
                {messages.auth.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="forgot-email" className="luxury-label">
                  {messages.auth.email}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="luxury-input"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
                >
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className="luxury-btn w-full">
                {loading ? messages.auth.submitting : messages.auth.sendResetLink}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p className="mt-5 text-center text-sm">
            <Link href="/login" className="font-semibold text-[#2c6e55] hover:underline">
              {messages.auth.backToLogin}
            </Link>
          </p>
        )}
      </div>
    </AppShell>
  );
}
