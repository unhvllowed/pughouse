import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || searchParams.get("cardName");

  if (!q) {
    return NextResponse.json({ error: "Missing search parameter 'q' or 'cardName'" }, { status: 400 });
  }

  try {
    // Filtering by 'pokemon' TCG specifically as they also have other TCGs.
    const tcgMatchUrl = `https://api.tcgmatch.cl/products/search?palabra=${encodeURIComponent(q)}&tcg=pokemon`;
    
    // Fetch data with a 1 hour revalidation cache
    const res = await fetch(tcgMatchUrl, {
      next: { revalidate: 3600 },
      headers: {
        'Accept': 'application/json',
        'Origin': 'https://tcgmatch.cl',
        'Referer': 'https://tcgmatch.cl/'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch data from TCGMatch API" }, { status: res.status });
    }

    const data = await res.json();
    
    // Return the JSON data directly to the client
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching TCGMatch prices:", err);
    return NextResponse.json({ error: "Internal Server Error fetching prices" }, { status: 500 });
  }
}
