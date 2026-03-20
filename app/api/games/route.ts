export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getGames } from "@/lib/services/games";

export async function GET() {
  const games = await getGames();
  return NextResponse.json(games);
}
