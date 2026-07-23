"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/components/providers/AppProviders";

export default function VisionPage() {
  const { messages, dir } = useApp();

  return (
    <AppShell>
      <div className="luxury-page" dir={dir}>
        <section className="luxury-section border-b border-[#ddd0b8]/40 bg-gradient-to-b from-[#faf6ef] to-[#f3ece0] px-4 text-center sm:px-6">
          <h1 className="luxury-heading-page">{messages.vision.title}</h1>
          <p className="luxury-muted mx-auto mt-6 max-w-2xl text-base leading-8 sm:text-lg sm:leading-9">
            {messages.vision.subtitle}
          </p>
        </section>

        <div className="mx-auto grid max-w-4xl gap-8 px-4 py-14 sm:gap-10 sm:px-6 sm:py-16">
          <article className="luxury-card min-w-0 overflow-visible p-8 sm:p-10 lg:p-12">
            <h2 className="luxury-heading-section text-xl sm:text-2xl">
              {messages.vision.leadTitle}
            </h2>
            <p className="luxury-body mt-6 break-words text-base leading-8 sm:text-[1.05rem] sm:leading-9">
              {messages.vision.leadBody}
            </p>
          </article>

          <article className="luxury-card min-w-0 overflow-visible p-8 sm:p-10 lg:p-12">
            <h2 className="luxury-heading-section text-xl sm:text-2xl">
              {messages.vision.futureTitle}
            </h2>
            <p className="luxury-body mt-6 break-words text-base leading-8 sm:text-[1.05rem] sm:leading-9">
              {messages.vision.futureBody}
            </p>
          </article>

          <article className="luxury-card min-w-0 overflow-visible p-8 sm:p-10 lg:p-12">
            <h2 className="luxury-heading-section text-xl sm:text-2xl">
              {messages.vision.promiseTitle}
            </h2>
            <p className="luxury-body mt-6 break-words text-base leading-8 sm:text-[1.05rem] sm:leading-9">
              {messages.vision.promiseBody}
            </p>
          </article>
        </div>
      </div>
    </AppShell>
  );
}
