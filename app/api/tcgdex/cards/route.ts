import { NextRequest, NextResponse } from "next/server";
import { getTcgSetsMap } from "@/lib/services/tcgdex";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "es";
  const TCGDEX_BASE = `https://api.tcgdex.net/v2/${lang}`;

  const name = searchParams.get("name") || "";
  const setName = searchParams.get("setName") || "";
  const illustrator = searchParams.get("illustrator") || "";
  const rarity = searchParams.get("rarity") || "";
  const category = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const itemsPerPage = 24;

  // 1. Build TCGdex URL WITHOUT pagination to get ALL results
  let url = `${TCGDEX_BASE}/cards?`;
  if (name) url += `name=${encodeURIComponent(name)}&`;
  if (setName) url += `set.name=${encodeURIComponent(setName)}&`;
  if (illustrator) url += `illustrator=${encodeURIComponent(illustrator)}&`;
  if (rarity) url += `rarity=${encodeURIComponent(rarity)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;

  try {
    // 2. Fetch shallow results and sets map
    const [res, setsMap] = await Promise.all([
      fetch(url, { next: { revalidate: 3600 } }),
      getTcgSetsMap(lang)
    ]);

    if (!res.ok) throw new Error("Error al obtener cartas");
    const allShallowCards = await res.json();
    if (!Array.isArray(allShallowCards)) return NextResponse.json([]);

    // 3. Sort ALL cards by releaseDate using the setsMap
    // The TCGdex ID is usually 'setid-localid'
    allShallowCards.sort((a: any, b: any) => {
      const setIdA = a.id.split('-')[0];
      const setIdB = b.id.split('-')[0];
      const dateA = setsMap[setIdA] || "0000-00-00";
      const dateB = setsMap[setIdB] || "0000-00-00";

      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return b.id.localeCompare(a.id); // Tie-breaker
    });

    // 4. Paginate the sorted list
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedCards = allShallowCards.slice(startIndex, startIndex + itemsPerPage);

    // 5. Hydrate ONLY the current page
    const hydratedCards = await Promise.all(
      paginatedCards.map(async (card: any) => {
        try {
          const detailRes = await fetch(`${TCGDEX_BASE}/cards/${card.id}`, {
            next: { revalidate: 86400 }
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            return {
              ...card,
              set: detail.set,
              rarity: detail.rarity,
              releaseDate: detail.set?.releaseDate 
            };
          }
        } catch (e) {}
        return card;
      })
    );
    
    return NextResponse.json(hydratedCards);
  } catch (error) {
    console.error("Cards search error:", error);
    return NextResponse.json({ error: "Error al conectar con TCGdex" }, { status: 500 });
  }
}
