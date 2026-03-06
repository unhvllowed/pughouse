import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../dev.db");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` } as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Iniciando seed...");

  const pokemon = await prisma.game.upsert({
    where: { slug: "pokemon" },
    update: {},
    create: { name: "Pokémon TCG", slug: "pokemon" },
  });

  await prisma.game.upsert({
    where: { slug: "yugioh" },
    update: {},
    create: { name: "Yu-Gi-Oh!", slug: "yugioh" },
  });

  await prisma.game.upsert({
    where: { slug: "magic" },
    update: {},
    create: { name: "Magic: The Gathering", slug: "magic" },
  });

  console.log("✅ Juegos creados");

  const sobre = await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: { 
      id: 1,
      name: "Sobre Prismatic Evolutions", 
      type: "PACK", 
      gameId: pokemon.id, 
      description: "Sobre individual sv08.5",
      quantity: 20,
      buyPrice: 3500,
      sellPrice: 5990,
      minStock: 5
    },
  });

  const caja = await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: { 
      id: 2,
      name: "Caja Booster Prismatic Evolutions", 
      type: "BOX", 
      gameId: pokemon.id, 
      description: "Caja de 36 sobres sv08.5",
      quantity: 3,
      buyPrice: 95000,
      sellPrice: 149990,
      minStock: 1
    },
  });

  const pikachu = await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: { 
      id: 3,
      name: "Pikachu ex (sv08 #054)", 
      type: "SINGLE", 
      gameId: pokemon.id, 
      description: "Surging Sparks - Full Art",
      quantity: 2,
      buyPrice: 8000,
      sellPrice: 14990,
      minStock: 1
    },
  });

  console.log("✅ Productos e Inventario creados");
  console.log("🎉 Seed completado exitosamente");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
