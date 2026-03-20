import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "es";
  const { id } = await params;

  try {
    let res = await fetch(`https://api.tcgdex.net/v2/${lang}/cards/${id}`, {
      next: { revalidate: 86400 },
    });
    
    // Fallback if not found in specific language
    if (!res.ok && lang !== "en") {
      res = await fetch(`https://api.tcgdex.net/v2/en/cards/${id}`, {
        next: { revalidate: 86400 },
      });
    }

    if (!res.ok) {
      return NextResponse.json({ error: "No card found" }, { status: 404 });
    }

    const data = await res.json();

    // --- TCGMatch (Chile) Integration robust from OLD ---
    const cardName = data?.name ?? "";
    const cardNumber = data?.localId ?? "";
    let tcgmatchData = null;

    if (cardName) {
      try {
        console.log(`[TCGMatch] Searching for: "${cardName}" (number: ${cardNumber})`);
        
        // Step 1: Search on TCGMatch
        const searchRes = await fetch(
          `https://api.tcgmatch.cl/products/search?palabra=${encodeURIComponent(cardName)}&tcg=pokemon`,
          {
            headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
            next: { revalidate: 300 },
          }
        );

        if (searchRes.ok) {
          const searchJson = await searchRes.ok ? await searchRes.json() : null;
          const items = searchJson?.data?.items ?? [];
          console.log(`[TCGMatch] Found ${items.length} potential matches`);

          if (items.length > 0) {
            // Step 2: Filter by card number if provided to avoid rarity mismatch
            let matchingItems = items;
            if (cardNumber) {
              const normalizedNum = cardNumber.trim().toLowerCase();
              const filtered = items.filter((item: any) => {
                const code = item.card?.data?.code?.toLowerCase() ?? "";
                const nameInResult = item.card?.name?.toLowerCase() ?? "";
                return code.includes(normalizedNum) || nameInResult.includes(normalizedNum);
              });
              if (filtered.length > 0) {
                matchingItems = filtered;
                console.log(`[TCGMatch] Filtered to ${matchingItems.length} matches using card number ${cardNumber}`);
              }
            }

            const matchedCard = matchingItems[0]?.card;
            if (matchedCard?._id) {
              const cardId = matchedCard._id;
              const cardCode = matchedCard?.data?.code ?? null;

              // Step 3: Fetch all listings for this specific card ID
              const listingsRes = await fetch(
                `https://tcgmatch.cl/api/cards/${cardId}`,
                {
                  headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
                  next: { revalidate: 300 },
                }
              );

              if (listingsRes.ok) {
                const listingsJson = await listingsRes.json();
                const listings = listingsJson?.products ?? [];
                
                const prices = listings.map((l: any) => l.price).filter((p: number) => p > 0);
                const stats = {
                  lowest: prices.length > 0 ? Math.min(...prices) : null,
                  highest: prices.length > 0 ? Math.max(...prices) : null,
                  average: prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : null,
                  count: listings.length
                };

                tcgmatchData = {
                  cardId,
                  cardCode,
                  stats,
                  listings: listings.slice(0, 10).map((l: any) => ({
                    price: l.price,
                    status: l.status,
                    language: l.language,
                    seller: l.user?.name ?? "Desconocido"
                  }))
                };
                console.log(`[TCGMatch] Successfully fetched stats: ${stats.count} listings found`);
              }
            }
          }
        }
      } catch (err) {
        console.error("[TCGMatch] Error during fetch:", err);
      }
    }
    // --- End TCGMatch Integration ---

    return NextResponse.json({
      ...data,
      tcgmatch: tcgmatchData,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed fetching prices" }, { status: 500 });
  }
}
