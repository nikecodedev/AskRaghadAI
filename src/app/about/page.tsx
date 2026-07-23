"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

export default function AboutPage() {
  const { messages, dir } = useApp();

  return (
    <AppShell>
      <div className="luxury-page" dir={dir}>
        <section className="luxury-section border-b border-[#ddd0b8]/40 bg-gradient-to-b from-[#faf6ef] to-[#f3ece0] px-4 text-center sm:px-6">
          <h1 className="luxury-heading-page">{messages.about.title}</h1>
          <p className="luxury-muted mx-auto mt-6 max-w-2xl text-base leading-8 sm:text-lg sm:leading-9">
            {messages.about.subtitle}
          </p>
        </section>

        <div className="mx-auto grid max-w-4xl gap-8 px-4 py-14 sm:gap-10 sm:px-6 sm:py-16">
          <article className="luxury-card min-w-0 overflow-visible p-8 sm:p-10 lg:p-12">
            <h2 className="luxury-heading-section text-xl sm:text-2xl">
              {messages.about.introTitle}
            </h2>
            <p className="luxury-body mt-6 break-words text-base leading-8 sm:text-[1.05rem] sm:leading-9">
              {messages.about.introBody}
            </p>
          </article>

          <article className="luxury-card min-w-0 overflow-visible p-8 sm:p-10 lg:p-12">
            <h2 className="luxury-heading-section text-xl sm:text-2xl">
              {messages.about.missionTitle}
            </h2>
            <p className="luxury-body mt-6 break-words text-base leading-8 sm:text-[1.05rem] sm:leading-9">
              {messages.about.missionBody}
            </p>
          </article>

          <article className="luxury-card min-w-0 overflow-visible p-8 sm:p-10 lg:p-12">
            <h2 className="luxury-heading-section text-xl sm:text-2xl">
              {messages.about.valuesTitle}
            </h2>
            <p className="luxury-body mt-6 break-words text-base leading-8 sm:text-[1.05rem] sm:leading-9">
              {messages.about.valuesBody}
            </p>
          </article>

        </div>
      </div>
    </AppShell>
  );
}
