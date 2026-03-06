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
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed fetching prices" }, { status: 500 });
  }
}
