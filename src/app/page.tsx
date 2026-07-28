"use client";

import { LuxuryHome } from "@/components/home/LuxuryHome";
import { ServiceCardsSection } from "@/components/cards/ServiceCardsSection";
import { FaqSection } from "@/components/home/FaqSection";
import { Footer } from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <>
      <LuxuryHome />
      <div id="categories" className="bg-[#f3ece0] pb-4">
        <ServiceCardsSection />
      </div>
      <div className="bg-[#f3ece0] pb-12">
        <FaqSection />
      </div>
      {/* The homepage renders its own header inside LuxuryHome, so it cannot
          use AppShell without showing two headers — hence the footer directly.
          Without this the landing page had no footer at all, which would leave
          the legal links and the affiliate disclosure off the most-visited
          page on the site. */}
      <Footer />
    </>
  );
}
