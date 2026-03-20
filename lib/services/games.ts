import { prisma } from "@/lib/prisma";

export async function getGames() {
  return prisma.game.findMany({ orderBy: { name: "asc" } });
}
