"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

interface Product {
  id: number;
  name: string;
  type: string;
  barcode?: string;
  quantity: number;
  sellPrice: number;
  game: { name: string };
}

interface Transaction {
  id: number;
  type: string;
  total: number;
  date: string;
  note: string;
  items: { product: { name: string }; quantity: number; unitPrice: number }[];
}

function formatCLP(n: number | string) {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return "$—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(num);
}

interface CartItem { productId: number; name: string; quantity: number; unitPrice: number; maxQty: number }

export default function VentasPage() {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"nueva" | "historial">("nueva");

  useEffect(() => {
    fetch("/api/inventory").then((r) => r.json()).then(setInventory);
    fetchTransactions();
  }, []);

  const fetchTransactions = () => {
    fetch("/api/transactions?type=VENTA").then((r) => r.json()).then((d) => setTransactions(d.transactions));
  };

  const filtered = inventory.filter((i) =>
    (i.name.toLowerCase().includes(search.toLowerCase()) || 
     i.barcode?.toLowerCase().includes(search.toLowerCase())) && i.quantity > 0
  );

  const addToCart = (item: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === item.id ? { ...c, quantity: Math.min(c.quantity + 1, c.maxQty) } : c
        );
      }
      return [...prev, { productId: item.id, name: item.name, quantity: 1, unitPrice: item.sellPrice, maxQty: item.quantity }];
    });
  };

  const removeFromCart = (productId: number) => setCart((prev) => prev.filter((c) => c.productId !== productId));

  const updateQty = (productId: number, qty: number) => {
    setCart((prev) => prev.map((c) => c.productId === productId ? { ...c, quantity: Math.max(1, Math.min(qty, c.maxQty)) } : c));
  };

  const total = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  const resetSale = () => {
    setCart([]);
    setNote("");
    setSearch("");
    setTab("nueva");
  };

  const handleSale = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "VENTA", 
          total, 
          note, 
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })) 
        }),
      });
      resetSale();
      fetchTransactions();
      fetch("/api/inventory").then((r) => r.json()).then(setInventory);
    } catch (error) {
      console.error("Error al registrar venta:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="main-header">
          <h2>💳 Ventas</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              className={`btn ${tab === "nueva" ? "btn-primary" : "btn-secondary"} btn-sm`} 
              onClick={resetSale}
            >
              Nueva Venta
            </button>
            <button 
              className={`btn ${tab === "historial" ? "btn-primary" : "btn-secondary"} btn-sm`} 
              onClick={() => setTab("historial")}
            >
              Historial
            </button>
          </div>
        </div>

        <div className="page-content">
          {tab === "nueva" ? (
            <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
              <div>
                <div className="section-header"><h3 className="section-title">Buscar Productos</h3></div>
                <div className="form-group">
                  <div className="search-input-wrap">
                    <span className="search-icon">🔍</span>
                    <input 
                      className="form-input" 
                      placeholder="Buscar por nombre o código..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 300px)", overflowY: "auto", paddingRight: 4 }}>
                  {filtered.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🔍</div>
                      <h3>Sin resultados</h3>
                      <p>No hay productos en stock que coincidan</p>
                    </div>
                  ) : filtered.map((item) => (
                    <div 
                      key={item.id} 
                      className="card card-sm" 
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "transform 0.1s" }} 
                      onClick={() => addToCart(item)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.type} · Stock: {item.quantity}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="text-green" style={{ fontWeight: 700 }}>{formatCLP(item.sellPrice)}</div>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 4, padding: "4px 8px" }}>+ Agregar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="section-header"><h3 className="section-title">🛒 Carrito</h3></div>
                {cart.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", borderStyle: "dashed", background: "transparent" }}>
                    <div className="empty-state" style={{ padding: 32 }}>
                      <div className="empty-icon">🛒</div>
                      <h3>Carrito vacío</h3>
                      <p>Selecciona productos de la izquierda</p>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ position: "sticky", top: 100 }}>
                    <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
                      {cart.map((item) => (
                        <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatCLP(item.unitPrice)} c/u</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                              <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }} onClick={() => updateQty(item.productId, item.quantity - 1)}>-</button>
                              <span style={{ fontSize: 14, minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                              <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }} onClick={() => updateQty(item.productId, item.quantity + 1)}>+</button>
                            </div>
                            <span className="text-green" style={{ fontWeight: 600, minWidth: 80, textAlign: "right" }}>{formatCLP(item.quantity * item.unitPrice)}</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.productId)} style={{ color: "var(--red)" }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="form-group" style={{ marginTop: 0 }}>
                      <label className="form-label">Nota de venta</label>
                      <input type="text" className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Pago con transferencia" />
                    </div>

                    <div style={{ padding: "16px 0", borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 20, fontWeight: 800 }}>
                      <span>Total</span>
                      <span className="text-green">{formatCLP(total)}</span>
                    </div>

                    <button className="btn btn-primary" style={{ width: "100%", height: 48, justifyContent: "center", fontSize: 16 }} onClick={handleSale} disabled={saving}>
                      {saving ? "Registrando..." : "✅ Confirmar Venta"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Fecha</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">🧾</div><h3>Sin ventas</h3></div></td></tr>
                  ) : transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-muted">#{tx.id}</td>
                      <td className="text-secondary">{tx.items.map((i) => `${i.product.name} x${i.quantity}`).join(", ")}</td>
                      <td className="text-green" style={{ fontWeight: 600 }}>{formatCLP(tx.total)}</td>
                      <td className="text-muted">{new Date(tx.date).toLocaleDateString("es-CL")}</td>
                      <td className="text-muted">{tx.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
