"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";
import { getMessagesSync } from "@/lib/i18n/get-messages";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/settings/store";

function buildFields() {
  const en = getMessagesSync("en");
  const ar = getMessagesSync("ar");
  return [
    { key: "hero.title", section: "heroSection", label: "Title / Tagline", defaultEn: en.hero.taglineShort, defaultAr: ar.hero.taglineShort },
    { key: "hero.subtitle", section: "heroSection", label: "Subtitle", defaultEn: en.hero.subtitle, defaultAr: ar.hero.subtitle, multiline: true },
    { key: "about.subtitle", section: "aboutSection", label: "Subtitle", defaultEn: en.about.subtitle, defaultAr: ar.about.subtitle, multiline: true },
    { key: "about.introBody", section: "aboutSection", label: "Intro text", defaultEn: en.about.introBody, defaultAr: ar.about.introBody, multiline: true },
    { key: "about.missionBody", section: "aboutSection", label: "Mission text", defaultEn: en.about.missionBody, defaultAr: ar.about.missionBody, multiline: true },
    { key: "vision.subtitle", section: "visionSection", label: "Subtitle", defaultEn: en.vision.subtitle, defaultAr: ar.vision.subtitle, multiline: true },
    { key: "vision.leadBody", section: "visionSection", label: "Main text", defaultEn: en.vision.leadBody, defaultAr: ar.vision.leadBody, multiline: true },
    { key: "contact.subtitle", section: "contactSection", label: "Subtitle", defaultEn: en.contact.subtitle, defaultAr: ar.contact.subtitle, multiline: true },
  ];
}

export default function AdminContentPage() {
  const { messages } = useApp();
  const [values, setValues] = useState<Record<string, string>>({});
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const fields = buildFields();

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const settings = d.settings ?? {};
        setValues(settings);
        if (settings["support.email"]) setSupportEmail(settings["support.email"]);
      })
      .catch(() => {});
  }, []);

  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { ...values, "support.email": supportEmail } }),
    });
    setSaving(false);
    setSaved(true);
  };

  const sections = [...new Set(fields.map((f) => f.section))];

  return (
    <AppShell>
      <div className="luxury-page mx-auto max-w-3xl px-4 py-10">
        <Link href="/admin" className="text-sm text-[#2c6e55] hover:underline">
          ← {messages.admin.title}
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-[#2c3e35]">{messages.admin.content}</h1>
        <p className="mt-1 text-sm text-[#7a8b82]">{messages.admin.contentDesc}</p>

        {sections.map((section) => (
          <section key={section} className="luxury-card mt-6 space-y-5 p-6">
            <h2 className="font-medium text-[#2c3e35]">
              {messages.admin[section as keyof typeof messages.admin]}
            </h2>
            {fields
              .filter((f) => f.section === section)
              .map((f) => (
                <div key={f.key} className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="luxury-label text-xs">
                      {f.label} ({messages.admin.englishLabel})
                    </label>
                    {f.multiline ? (
                      <textarea
                        className="luxury-input min-h-[90px]"
                        placeholder={f.defaultEn}
                        value={values[`${f.key}.en`] ?? ""}
                        onChange={(e) => set(`${f.key}.en`, e.target.value)}
                        dir="ltr"
                      />
                    ) : (
                      <input
                        className="luxury-input"
                        placeholder={f.defaultEn}
                        value={values[`${f.key}.en`] ?? ""}
                        onChange={(e) => set(`${f.key}.en`, e.target.value)}
                        dir="ltr"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="luxury-label text-xs">
                      {f.label} ({messages.admin.arabicLabel})
                    </label>
                    {f.multiline ? (
                      <textarea
                        className="luxury-input min-h-[90px]"
                        placeholder={f.defaultAr}
                        value={values[`${f.key}.ar`] ?? ""}
                        onChange={(e) => set(`${f.key}.ar`, e.target.value)}
                        dir="rtl"
                      />
                    ) : (
                      <input
                        className="luxury-input"
                        placeholder={f.defaultAr}
                        value={values[`${f.key}.ar`] ?? ""}
                        onChange={(e) => set(`${f.key}.ar`, e.target.value)}
                        dir="rtl"
                      />
                    )}
                  </div>
                </div>
              ))}
          </section>
        ))}

        <section className="luxury-card mt-6 space-y-2 p-6">
          <h2 className="font-medium text-[#2c3e35]">{messages.admin.contactSection}</h2>
          <label className="luxury-label text-xs">{messages.admin.supportEmailLabel}</label>
          <input
            className="luxury-input"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            dir="ltr"
          />
        </section>

        <div className="mt-6 flex items-center gap-4">
          <button type="button" onClick={save} disabled={saving} className="luxury-btn">
            {saving ? messages.admin.syncing : messages.admin.saveContent}
          </button>
          {saved && <p className="text-sm text-[#2c6e55]">{messages.admin.contentSaved}</p>}
        </div>
      </div>
    </AppShell>
  );
}
