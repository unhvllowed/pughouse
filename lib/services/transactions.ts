import { prisma } from "@/lib/prisma";

export async function getTransactions(params: { type?: string; page?: number; limit?: number } = {}) {
  const { type, page = 1, limit = 20 } = params;

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

  return { transactions, total, page, limit };
}
