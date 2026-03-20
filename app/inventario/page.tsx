import { getInventory } from "@/lib/services/inventory";
import { getGames } from "@/lib/services/games";
import InventoryClient from "./InventoryClient";
import { Product, Game } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const [items, games] = await Promise.all([
    getInventory() as Promise<Product[]>,
    getGames() as Promise<Game[]>,
  ]);

  return <InventoryClient initialItems={items} initialGames={games} />;
}
