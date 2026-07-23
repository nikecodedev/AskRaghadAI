"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProviders";

export function ChangePasswordForm() {
  const { messages, dir } = useApp();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError(messages.auth.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(messages.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? messages.auth.requestFailed);
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError(messages.auth.requestFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="luxury-card mt-6 p-6 sm:p-8" dir={dir}>
      <h2 className="text-lg font-semibold text-[#24332c]">{messages.auth.changePasswordTitle}</h2>
      <p className="luxury-muted mt-2 text-sm">{messages.auth.changePasswordSubtitle}</p>

      {success ? (
        <p
          role="status"
          className="mt-5 rounded-lg border border-[#2c6e55]/25 bg-[#2c6e55]/8 px-3 py-2.5 text-sm font-medium text-[#1f5240]"
        >
          {messages.auth.changePasswordSuccess}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="current-password" className="luxury-label">
              {messages.auth.currentPassword}
            </label>
            <input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="luxury-input"
              dir="ltr"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="change-new-password" className="luxury-label">
              {messages.auth.newPassword}
            </label>
            <input
              id="change-new-password"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="luxury-input"
              dir="ltr"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="change-confirm-password" className="luxury-label">
              {messages.auth.confirmPassword}
            </label>
            <input
              id="change-confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          <button type="submit" disabled={loading} className="luxury-btn">
            {loading ? messages.auth.submitting : messages.auth.changePasswordButton}
          </button>
        </form>
      )}
    </section>
  );
}
