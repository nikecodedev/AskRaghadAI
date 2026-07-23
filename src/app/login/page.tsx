"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";
import { useAuth } from "@/components/providers/AuthProvider";

async function parseJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { error: "Request failed" };
  }
  return res.json();
}

function LoginForm() {
  const { messages, dir } = useApp();
  const { refresh, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(() =>
    searchParams.get("mode") === "register" ? "register" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const switchMode = (nextMode: "login" | "register") => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setError("");

    // Keep deep links/shareable state in sync without navigating or reloading.
    const params = new URLSearchParams(window.location.search);
    if (nextMode === "register") {
      params.set("mode", "register");
    } else {
      params.delete("mode");
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/login?${query}` : "/login");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        setError(data.error ?? messages.auth.requestFailed);
        return;
      }
      await refresh();
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch {
      setError(messages.auth.requestFailed);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <AppShell>
        <div className="luxury-page flex min-h-[40vh] items-center justify-center luxury-muted">
          {messages.dashboard.loading}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="luxury-page mx-auto w-full max-w-lg px-4 py-12 sm:py-16" dir={dir}>
        <div className="text-center">
          <p className="luxury-overline">{messages.brand}</p>
          <h1 className="luxury-heading-page mt-3 transition-opacity duration-200">
          {mode === "login" ? messages.auth.loginTitle : messages.auth.registerTitle}
          </h1>
        </div>

        <div className="luxury-card mt-8 p-2 shadow-[0_12px_42px_rgba(44,62,53,0.09)] sm:p-3">
          <div
            role="tablist"
            aria-label={messages.auth.tabsLabel}
            className="grid grid-cols-2 gap-1 rounded-xl bg-[#eee6d8] p-1"
          >
            <button
              id="auth-login-tab"
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              aria-controls="auth-form-panel"
              onClick={() => switchMode("login")}
              className={`rounded-lg px-4 py-3 text-base font-semibold transition-all duration-200 ${
                mode === "login"
                  ? "bg-white text-[#1f5240] shadow-sm ring-1 ring-[#d4c4a0]/60"
                  : "text-[#5f6d63] hover:bg-white/55 hover:text-[#24332c]"
              }`}
            >
              {messages.auth.loginTitle}
            </button>
            <button
              id="auth-register-tab"
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              aria-controls="auth-form-panel"
              onClick={() => switchMode("register")}
              className={`rounded-lg px-4 py-3 text-base font-semibold transition-all duration-200 ${
                mode === "register"
                  ? "bg-white text-[#1f5240] shadow-sm ring-1 ring-[#d4c4a0]/60"
                  : "text-[#5f6d63] hover:bg-white/55 hover:text-[#24332c]"
              }`}
            >
              {messages.auth.registerTitle}
            </button>
          </div>

          <form
            id="auth-form-panel"
            role="tabpanel"
            aria-labelledby={
              mode === "login" ? "auth-login-tab" : "auth-register-tab"
            }
            onSubmit={submit}
            className="space-y-6 px-5 pb-6 pt-7 sm:px-7 sm:pb-7"
          >
            <div
              className={`grid transition-all duration-300 ease-out ${
                mode === "register"
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0"
              }`}
              aria-hidden={mode !== "register"}
            >
              <div className="overflow-hidden">
                <div className="space-y-2 pb-1">
                  <label htmlFor="auth-name" className="luxury-label">
                    {messages.auth.name}
                  </label>
                  <input
                    id="auth-name"
                    name="name"
                    autoComplete="name"
                    required={mode === "register"}
                    disabled={mode !== "register"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="luxury-input"
                    dir={dir}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="auth-email" className="luxury-label">
                {messages.auth.email}
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="luxury-input"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="auth-password" className="luxury-label">
                  {messages.auth.password}
                </label>
                {mode === "login" ? (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#2c6e55] hover:underline"
                  >
                    {messages.auth.forgotPassword}
                  </Link>
                ) : null}
              </div>
              <input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="luxury-input"
                dir="ltr"
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
              {loading
                ? messages.auth.submitting
                : mode === "login"
                  ? messages.auth.submitLogin
                  : messages.auth.submitRegister}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm font-medium text-[#4f5f56]">
          {mode === "login" ? messages.auth.noAccount : messages.auth.hasAccount}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="font-semibold text-[#2c6e55] underline-offset-4 hover:underline"
          >
            {mode === "login"
              ? messages.auth.submitRegister
              : messages.auth.submitLogin}
          </button>
        </p>
      </div>
    </AppShell>
  );
}

export default function LoginPage() {
  const { messages } = useApp();

  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="luxury-page flex min-h-[40vh] items-center justify-center luxury-muted">
            {messages.dashboard.loading}
          </div>
        </AppShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
