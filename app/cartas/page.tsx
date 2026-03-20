import { getTcgSets } from "@/lib/services/tcgdex";
import CardsClient from "./CardsClient";
import { TcgSet } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CartasPage() {
  const sets = await getTcgSets("es") as TcgSet[];

  return <CardsClient initialSets={sets} />;
}
