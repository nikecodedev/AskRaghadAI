"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProviders";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#ddd0b8]/60 bg-white/70 backdrop-blur transition hover:border-[#c9a962]/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
      >
        <span className="font-serif text-base font-semibold tracking-wide text-[#24332c] sm:text-[1.02rem]">{q}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-[#c9a962] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="luxury-body px-5 pb-5">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const { messages, dir } = useApp();

  return (
    <section id="faq" className="luxury-section mx-auto max-w-3xl px-4 sm:px-6" dir={dir}>
      <div className="mb-8 text-center sm:mb-10">
        <h2 className="luxury-heading-section text-2xl sm:text-3xl">{messages.faq.title}</h2>
        <p className="luxury-muted mt-3">{messages.faq.subtitle}</p>
      </div>
      <div className="space-y-4">
        {messages.faq.items.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </section>
  );
}
