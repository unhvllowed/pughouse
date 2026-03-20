import { getInventory } from "@/lib/services/inventory";
import { getTransactions } from "@/lib/services/transactions";
import SalesClient from "./SalesClient";
import { Product, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const [inventory, { transactions }] = await Promise.all([
    getInventory() as Promise<Product[]>,
    getTransactions({ type: "VENTA" }) as Promise<{ transactions: Transaction[] }>,
  ]);

  return (
    <SalesClient 
      initialInventory={inventory} 
      initialTransactions={transactions} 
    />
  );
}
