"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

export default function ContactPage() {
  const { messages, dir } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? messages.contact.error);
        setStatus("error");
        return;
      }
      setName("");
      setEmail("");
      setMessage("");
      setStatus("success");
    } catch {
      setError(messages.contact.error);
      setStatus("error");
    }
  };

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-2xl px-4 py-12 sm:py-16" dir={dir}>
        <h1 className="luxury-heading-page text-center">{messages.contact.title}</h1>
        <p className="luxury-muted mt-5 text-center text-base leading-8 sm:text-lg">
          {messages.contact.subtitle}
        </p>
        <p className="luxury-muted mt-2 text-center text-sm" dir="ltr">
          <a href={`mailto:${messages.contact.supportEmail}`} className="hover:underline">
            {messages.contact.supportEmail}
          </a>
        </p>

        <form onSubmit={submit} className="luxury-card mt-10 space-y-6 p-8 sm:p-10">
          <div className="space-y-2">
            <label className="luxury-label">{messages.contact.name}</label>
            <input
              className="luxury-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              dir={dir}
            />
          </div>
          <div className="space-y-2">
            <label className="luxury-label">{messages.contact.email}</label>
            <input
              type="email"
              className="luxury-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <label className="luxury-label">{messages.contact.message}</label>
            <textarea
              className="luxury-input min-h-[160px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              dir={dir}
            />
          </div>

          {status === "success" && (
            <p className="text-sm text-[#2c6e55]">{messages.contact.success}</p>
          )}
          {(status === "error" || error) && (
            <p className="text-sm text-red-600">{error || messages.contact.error}</p>
          )}

          <button type="submit" className="luxury-btn w-full" disabled={status === "loading"}>
            {status === "loading" ? messages.contact.sending : messages.contact.send}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
