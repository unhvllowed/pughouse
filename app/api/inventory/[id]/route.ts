import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { game: true, card: { include: { set: true } } },
  });
  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const safeProduct = {
    ...product,
    quantity: Number(product.quantity) || 0,
    buyPrice: Number(product.buyPrice) || 0,
    sellPrice: Number(product.sellPrice) || 0,
    minStock: Number(product.minStock) || 1,
  };

  return NextResponse.json(safeProduct);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Quick stock-only update (e.g. from quick +/- button or barcode scanner)
  if (body.stockDelta !== undefined) {
    const current = await prisma.product.findUnique({ where: { id: parseInt(id) }, select: { quantity: true } });
    if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const newQty = Math.max(0, Number(current.quantity) + Number(body.stockDelta));
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { quantity: newQty },
      include: { game: true },
    });
    return NextResponse.json(product);
  }

  // Full update
  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      type: body.type,
      barcode: body.barcode || null,
      quantity: Number(body.quantity) ?? 0,
      buyPrice: Number(body.buyPrice) ?? 0,
      sellPrice: Number(body.sellPrice) ?? 0,
      minStock: Number(body.minStock) ?? 1,
      description: body.description,
      imageUrl: body.imageUrl,
      gameId: Number(body.gameId),   // ← was missing before!
    },
    include: { game: true },
  });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
