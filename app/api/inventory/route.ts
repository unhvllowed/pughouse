import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    game: true;
    card: { include: { set: true } };
  };
}>;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");
  const lowStock = searchParams.get("lowStock") === "true";
  const search = searchParams.get("search") || "";
  const barcode = searchParams.get("barcode") || "";

  const items = await prisma.product.findMany({
    where: {
      AND: [
        barcode ? { barcode: barcode } : {},
        gameId ? { gameId: parseInt(gameId) } : {},
        lowStock ? { OR: [{ quantity: { lte: 0 } }, { quantity: { lte: prisma.product.fields.minStock } }] } : {},
        search ? {
          OR: [
            { name: { contains: search } },
            { barcode: { contains: search } },
          ]
        } : {},
      ]
    },
    include: {
      game: true,
      card: { include: { set: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const safeItems = (items as ProductWithRelations[]).map((item: ProductWithRelations) => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    buyPrice: Number(item.buyPrice) || 0,
    sellPrice: Number(item.sellPrice) || 0,
    minStock: Number(item.minStock) || 1,
  }));

  return NextResponse.json(safeItems);
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
