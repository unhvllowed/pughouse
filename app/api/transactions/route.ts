import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface TransactionItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

interface TransactionRequestBody {
  type: "VENTA" | "COMPRA" | "DEVOLUCION";
  total: number;
  note?: string;
  items: TransactionItemInput[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const transactions = await prisma.transaction.findMany({
    where: { ...(type && { type }) },
    include: {
      items: { include: { product: { include: { game: true } } } },
    },
    orderBy: { date: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.transaction.count({ where: { ...(type && { type }) } });

  return NextResponse.json({ transactions, total, page, limit });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as TransactionRequestBody;
  // Crear transacción y actualizar inventario de forma atómica
  const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newTx = await tx.transaction.create({
      data: {
        type: body.type,
        total: body.total,
        note: body.note,
        items: {
          create: body.items.map((item: TransactionItemInput) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // Registrar en Flujo de Caja
    let cashFlowType = "INGRESO";
    let category = "Otro"; // Default

    if (body.type === "VENTA") {
      cashFlowType = "INGRESO";
      category = "Venta de cartas"; // Align with UI: "Venta de cartas", "Venta de sobres", etc.
    } else if (body.type === "COMPRA") {
      cashFlowType = "EGRESO";
      category = "Compra de stock"; // Align with UI: "Compra de stock"
    } else if (body.type === "DEVOLUCION") {
      cashFlowType = "EGRESO";
      category = "Otro";
    }

    await tx.cashFlow.create({
      data: {
        type: cashFlowType,
        amount: body.total,
        category: category,
        description: body.note || `Transacción de ${body.type.toLowerCase()}`,
        reference: String(newTx.id),
        date: new Date(), // Explicit date
      },
    });

    // Actualizar inventario directamente en Product
    for (const item of body.items) {
      const q = Number(item.quantity) || 0;
      const delta = body.type === "VENTA" ? -q : q;
      await tx.product.update({
        where: { id: Number(item.productId) },
        data: { quantity: { increment: delta } },
      });
    }

    return newTx;
  });

  return NextResponse.json(transaction, { status: 201 });
}
