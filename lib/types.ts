export interface Game {
  id: number;
  name: string;
  imageUrl?: string | null;
}

export interface Product {
  id: number;
  name: string;
  type: string;
  barcode: string | null;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  minStock: number;
  imageUrl?: string | null;
  gameId: number;
  game?: Game | null;
}

export interface Transaction {
  id: number;
  type: string;
  total: number;
  date: string | Date;
  note: string | null;
  items: TransactionItem[];
}

export interface TransactionItem {
  id: number;
  transactionId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product: Product;
}

export interface TcgSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: {
    total: number;
    official: number;
  };
  releaseDate?: string;
}

export interface TcgCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  set?: { id: string; name: string };
  rarity?: string;
}
