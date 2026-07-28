"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

/**
 * Shared shell for the disclaimer, privacy and terms pages.
 *
 * All three are a heading plus one block of client-supplied legal copy, so
 * they share a component rather than repeating the same markup three times.
 * The wording itself lives in the message files and is reproduced verbatim in
 * both languages — this is a legal notice, so it is translated copy to render
 * exactly, not text to reword.
 */
export function LegalPage({ section }: { section: "disclaimer" | "privacy" | "terms" }) {
  const { messages, dir } = useApp();
  const content = messages.legal[section];

  return (
    <AppShell>
      <div className="luxury-page" dir={dir}>
        <section className="luxury-section border-b border-[#ddd0b8]/40 bg-gradient-to-b from-[#faf6ef] to-[#f3ece0] px-4 text-center sm:px-6">
          <h1 className="luxury-heading-page">{content.title}</h1>
        </section>

        <div className="mx-auto grid max-w-4xl gap-8 px-4 py-14 sm:gap-10 sm:px-6 sm:py-16">
          <article className="luxury-card min-w-0 overflow-visible p-8 sm:p-10 lg:p-12">
            <p className="luxury-body break-words text-base leading-8 sm:text-[1.05rem] sm:leading-9">
              {content.body}
            </p>
          </article>
        </div>
      </div>
    </AppShell>
  );
}
