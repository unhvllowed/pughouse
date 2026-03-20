import { prisma } from "@/lib/prisma";

export async function getInventory(params: { search?: string; gameId?: number; lowStock?: boolean } = {}) {
  const { search, gameId, lowStock } = params;

  const items = await prisma.product.findMany({
    where: {
      AND: [
        gameId ? { gameId } : {},
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

  return items.map((item) => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    buyPrice: Number(item.buyPrice) || 0,
    sellPrice: Number(item.sellPrice) || 0,
    minStock: Number(item.minStock) || 1,
  }));
}
