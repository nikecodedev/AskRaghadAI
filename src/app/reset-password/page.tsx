"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

function ResetPasswordForm() {
  const { messages, dir } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(messages.auth.invalidResetLink);
      return;
    }
    if (password.length < 6) {
      setError(messages.auth.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(messages.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? messages.auth.requestFailed);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError(messages.auth.requestFailed);
    } finally {
      setLoading(false);
    }
  };

  if (!token && !done) {
    return (
      <div className="luxury-card mt-8 p-6 text-center sm:p-7">
        <p className="text-sm text-red-700">{messages.auth.invalidResetLink}</p>
        <Link href="/forgot-password" className="luxury-btn mt-4 inline-flex">
          {messages.auth.forgotTitle}
        </Link>
      </div>
    );
  }

  return (
    <div className="luxury-card mt-8 p-6 sm:p-7">
      {done ? (
        <div className="space-y-4 text-center">
          <p className="text-sm font-medium text-[#2c3e35]">{messages.auth.resetSuccess}</p>
          <Link href="/login" className="luxury-btn inline-flex">
            {messages.auth.backToLogin}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="new-password" className="luxury-label">
              {messages.auth.newPassword}
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="luxury-input"
              dir="ltr"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="luxury-label">
              {messages.auth.confirmPassword}
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="luxury-input"
              dir="ltr"
              autoComplete="new-password"
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
            {loading ? messages.auth.submitting : messages.auth.resetPassword}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  const { messages, dir } = useApp();

  return (
    <AppShell>
      <div className="luxury-page mx-auto w-full max-w-lg px-4 py-12 sm:py-16" dir={dir}>
        <div className="text-center">
          <p className="luxury-overline">{messages.brand}</p>
          <h1 className="luxury-heading-page mt-3">{messages.auth.resetTitle}</h1>
        </div>
        <Suspense
          fallback={
            <div className="luxury-card mt-8 p-6 text-center text-sm text-[#7a8b82] sm:p-7">
              {messages.auth.submitting}
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
