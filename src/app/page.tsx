"use client";

import { LuxuryHome } from "@/components/home/LuxuryHome";
import { ServiceCardsSection } from "@/components/cards/ServiceCardsSection";
import { FaqSection } from "@/components/home/FaqSection";

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
    </>
  );
}
