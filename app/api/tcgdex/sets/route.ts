import { NextRequest, NextResponse } from "next/server";

interface TcgSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: {
    total: number;
    official: number;
  };
  releaseDate?: string;
  serie?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "es";
  const TCGDEX_BASE = `https://api.tcgdex.net/v2/${lang}`;

  try {
    const res = await fetch(`${TCGDEX_BASE}/sets`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Error al obtener sets");
    const shallowSets = await res.json();

    if (!Array.isArray(shallowSets)) return NextResponse.json([]);

    // Hydrate sets to get releaseDate for sorting
    const hydratedSets = await Promise.all(
      shallowSets.map(async (set: TcgSet) => {
        try {
          // If it's already cached by Next.js, this is fast
          const detailRes = await fetch(`${TCGDEX_BASE}/sets/${set.id}`, {
            next: { revalidate: 604800 } // Sets technical data rarely changes
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            return {
              ...set,
              releaseDate: detail.releaseDate,
              serie: detail.serie?.name
            };
          }
        } catch (e) {}
        return set;
      })
    );

    // Sort by releaseDate DESC
    const sorted = hydratedSets.sort((a, b) => {
      const dateA = a.releaseDate || "0000-00-00";
      const dateB = b.releaseDate || "0000-00-00";
      
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      
      // Secondary sort by ID in reverse
      return b.id.localeCompare(a.id);
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Sets error:", error);
    return NextResponse.json({ error: "Error al conectar con TCGdex" }, { status: 500 });
  }
}
