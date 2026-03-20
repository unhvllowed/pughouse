export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    game: true;
    card: { include: { set: true } };
  };
}>;

import { getInventory } from "@/lib/services/inventory";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId") ? Number(searchParams.get("gameId")) : undefined;
  const lowStock = searchParams.get("lowStock") === "true";
  const search = searchParams.get("search") || undefined;

  const items = await getInventory({ search, gameId, lowStock });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const product = await prisma.product.create({
    data: {
      name: body.name,
      type: body.type,
      barcode: body.barcode || null,
      quantity: Number(body.quantity) || 0,
      buyPrice: Number(body.buyPrice) || 0,
      sellPrice: Number(body.sellPrice) || 0,
      minStock: Number(body.minStock) || 1,
      gameId: Number(body.gameId) || 1,
      cardId: body.cardId || null,
      description: body.description || "",
      imageUrl: body.imageUrl || null,
    },
    include: { game: true },
  });
  return NextResponse.json(product, { status: 201 });
}
