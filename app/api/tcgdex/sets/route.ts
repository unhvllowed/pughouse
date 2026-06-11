import { NextRequest, NextResponse } from "next/server";
import { getTcgSets } from "@/lib/services/tcgdex";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "es";

  try {
    const sorted = await getTcgSets(lang);
    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Sets error:", error);
    return NextResponse.json({ error: "Error al conectar con TCGdex" }, { status: 500 });
  }
}

