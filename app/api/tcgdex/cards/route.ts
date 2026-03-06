import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "es";
  const TCGDEX_BASE = `https://api.tcgdex.net/v2/${lang}`;

  const name = searchParams.get("name") || "";
  const setName = searchParams.get("setName") || "";
  const illustrator = searchParams.get("illustrator") || "";
  const rarity = searchParams.get("rarity") || "";
  const category = searchParams.get("category") || "";
  const page = searchParams.get("page") || "1";

  let url = `${TCGDEX_BASE}/cards?`;
  if (name) url += `name=${encodeURIComponent(name)}&`;
  if (setName) url += `set.name=${encodeURIComponent(setName)}&`;
  if (illustrator) url += `illustrator=${encodeURIComponent(illustrator)}&`;
  if (rarity) url += `rarity=${encodeURIComponent(rarity)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;
  
  // Apply pagination using TCGdex native syntax. We load 28 cards per page.
  url += `pagination:page=${page}&pagination:itemsPerPage=28&`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("Error al obtener cartas");
    const shallowData = await res.json();
    
    // TCGdex search endpoint ONLY returns { id, localId, name, image }. 
    // We already paginated the original TCGdex call to 24 items, so we can hydrate ALL returned results safely.
    const cardsToHydrate = (Array.isArray(shallowData) ? shallowData : []);
    
    const hydratedCards = await Promise.all(
      cardsToHydrate.map(async (card) => {
        try {
          const detailRes = await fetch(`${TCGDEX_BASE}/cards/${card.id}`, {
            next: { revalidate: 86400 } // Caché súper largo para no matar la red
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            return {
              ...card,
              set: detail.set,
              rarity: detail.rarity
            };
          }
        } catch (e) {
          // silently ignore individual errors
        }
        return card; // Fallback to shallow if fetch fails
      })
    );
    
    return NextResponse.json(hydratedCards);
  } catch {
    return NextResponse.json({ error: "Error al conectar con TCGdex" }, { status: 500 });
  }
}
