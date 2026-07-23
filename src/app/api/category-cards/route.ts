import { NextResponse } from "next/server";
import { listActiveCategoryCards } from "@/lib/category-cards/store";
import { DEFAULT_CATEGORY_CARDS } from "@/lib/category-cards/defaults";

export async function GET() {
  try {
    const cards = await listActiveCategoryCards();
    const response = NextResponse.json({ cards });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300",
    );
    return response;
  } catch (error) {
    console.error("[category-cards public]", error);
    // Fallback so homepage still renders if DB is down
    return NextResponse.json({
      cards: DEFAULT_CATEGORY_CARDS.map((c, i) => ({
        id: `fallback-${i}`,
        ...c,
        active: true,
      })),
    });
  }
}
