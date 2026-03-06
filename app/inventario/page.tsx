"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

interface Product {
  id: number;
  name: string;
  type: string;
  barcode?: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  minStock: number;
  imageUrl?: string;
  gameId: number;
  game?: { name: string };
}

interface Game { id: number; name: string }

interface ScannedItem {
  product: Product;
  qty: number;   // units scanned in this inventory session
}

function formatCLP(n: number | string) {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return "$—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(num);
}

const TIPOS = ["SINGLE", "PACK", "BOX", "ACCESORIO", "OTRO", "ETB", "SOBRE", "BEBIDA", "BOOSTER PACK"];

const EMPTY_FORM = { name: "", type: "SINGLE", barcode: "", quantity: "0", buyPrice: "0", sellPrice: "0", minStock: "1", gameId: "" };

export default function InventarioPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Quick stock modal
  const [quickItem, setQuickItem] = useState<Product | null>(null);
  const [quickDelta, setQuickDelta] = useState("1");

  // Hacer Inventario modal
  const [showInventario, setShowInventario] = useState(false);
  const [scanned, setScanned] = useState<ScannedItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [savingInventario, setSavingInventario] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [invRes, gamesRes] = await Promise.all([
        fetch(`/api/inventory?search=${encodeURIComponent(search)}`),
        fetch("/api/games"),
      ]);
      const data = await invRes.json();
      const gamesData = await gamesRes.json();
      setItems(Array.isArray(data) ? data : []);
      setGames(Array.isArray(gamesData) ? gamesData : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);

  // Focus barcode input when Hacer Inventario opens
  useEffect(() => {
    if (showInventario) setTimeout(() => barcodeRef.current?.focus(), 100);
  }, [showInventario]);

  const openAdd = (defaultGameId?: string) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, gameId: defaultGameId ?? (games[0] ? String(games[0].id) : "0") });
    setShowModal(true);
  };

  const openEdit = (item: Product) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      type: item.type || "SINGLE",
      barcode: item.barcode || "",
      quantity: String(item.quantity ?? 0),
      buyPrice: String(item.buyPrice ?? 0),
      sellPrice: String(item.sellPrice ?? 0),
      minStock: String(item.minStock ?? 1),
      gameId: String(item.gameId),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type,
      barcode: form.barcode || null,
      quantity: parseInt(form.quantity) || 0,
      buyPrice: parseFloat(form.buyPrice) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      minStock: parseInt(form.minStock) || 1,
      gameId: parseInt(form.gameId),
    };
    try {
      if (editing) {
        await fetch(`/api/inventory/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setShowModal(false);
      load();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este producto permanentemente?")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    load();
  };

  // Quick stock: save delta
  const handleQuickStock = async () => {
    if (!quickItem) return;
    const delta = parseInt(quickDelta) || 0;
    if (delta === 0) { setQuickItem(null); return; }
    await fetch(`/api/inventory/${quickItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockDelta: delta }),
    });
    setQuickItem(null);
    setQuickDelta("1");
    load();
  };

  // Hacer Inventario: handle scanned barcode
  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = barcodeInput.trim();
    if (!code) return;
    setBarcodeInput("");
    setBarcodeError("");

    // Search in current items list first (fast), then API
    let product = items.find((p) => p.barcode === code);
    if (!product) {
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(code)}`);
      const data: Product[] = await res.json();
      product = data.find((p) => p.barcode === code);
    }

    if (!product) {
      setBarcodeError(`❌ Sin resultado para código: ${code}`);
      return;
    }

    setScanned((prev) => {
      const existing = prev.find((s) => s.product.id === product!.id);
      if (existing) {
        return prev.map((s) => s.product.id === product!.id ? { ...s, qty: s.qty + 1 } : s);
      }
      return [...prev, { product, qty: 1 }];
    });
    setTimeout(() => barcodeRef.current?.focus(), 50);
  };

  const handleConfirmInventario = async () => {
    if (scanned.length === 0) return;
    setSavingInventario(true);
    await Promise.all(
      scanned.map((s) =>
        fetch(`/api/inventory/${s.product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockDelta: s.qty }),
        })
      )
    );
    setSavingInventario(false);
    setShowInventario(false);
    setScanned([]);
    load();
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="main-header">
          <h2>📦 Inventario</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setScanned([]); setBarcodeError(""); setShowInventario(true); }}>
              📦 Hacer Inventario
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => openAdd()}>+ Nuevo Producto</button>
          </div>
        </div>

        <div className="page-content">
          <div className="table-container">
            <div className="table-header">
              <div className="search-input-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="form-input"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ minWidth: 260 }}
                />
              </div>
              <span className="text-muted" style={{ fontSize: 13 }}>{items.length} ítems</span>
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>Inventario vacío</h3>
                <p>Agrega productos para comenzar</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Producto / Barcode</th>
                    <th>Tipo</th>
                    <th>Juego</th>
                    <th>Stock</th>
                    <th>P. Compra</th>
                    <th>P. Venta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        {item.barcode && <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>[ {item.barcode} ]</div>}
                      </td>
                      <td><span className="badge badge-purple">{item.type}</span></td>
                      <td className="text-secondary">{item.game?.name || "—"}</td>
                      <td>
                        <span className={`badge ${item.quantity <= item.minStock ? "badge-red" : item.quantity < item.minStock * 3 ? "badge-yellow" : "badge-green"}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="text-muted">{formatCLP(item.buyPrice)}</td>
                      <td className="text-green" style={{ fontWeight: 600 }}>{formatCLP(item.sellPrice)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Agregar stock rápido"
                            onClick={() => { setQuickItem(item); setQuickDelta("1"); }}
                          >📦+</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ── Editar / Nuevo Producto Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? "Editar Producto" : "Nuevo Producto"}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Pikachu ex - sv08 #54" />
              </div>
              <div className="form-group">
                <label className="form-label">Código de Barras</label>
                <input type="text" className="form-input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Escanear aquí..." autoFocus />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Juego</label>
                  <select className="form-select" value={form.gameId} onChange={(e) => setForm({ ...form, gameId: e.target.value })}>
                    {games.map((g) => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Stock Actual</label>
                  <input type="number" className="form-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Mínimo</label>
                  <input type="number" className="form-input" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} min="0" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Precio Compra (CLP)</label>
                  <input type="number" className="form-input" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Venta (CLP)</label>
                  <input type="number" className="form-input" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} min="0" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Stock Modal ─────────────────────────────────────────────── */}
      {quickItem && (
        <div className="modal-overlay" onClick={() => setQuickItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">📦 Agregar Stock</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setQuickItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--text-secondary)", marginBottom: 12 }}>{quickItem.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setQuickDelta((v) => String(Math.max(1, parseInt(v) - 1)))} style={{ fontSize: 18, padding: "4px 14px" }}>−</button>
                <input
                  type="number"
                  className="form-input"
                  value={quickDelta}
                  onChange={(e) => setQuickDelta(e.target.value)}
                  style={{ textAlign: "center", fontSize: 20, fontWeight: 700, width: 80 }}
                  autoFocus
                />
                <button className="btn btn-secondary" onClick={() => setQuickDelta((v) => String(parseInt(v) + 1))} style={{ fontSize: 18, padding: "4px 14px" }}>+</button>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                Stock actual: <strong>{quickItem.quantity}</strong> → nuevo: <strong>{Math.max(0, quickItem.quantity + (parseInt(quickDelta) || 0))}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setQuickItem(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleQuickStock}>✅ Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hacer Inventario Modal ────────────────────────────────────────── */}
      {showInventario && (
        <div className="modal-overlay" onClick={() => setShowInventario(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="modal-header">
              <span className="modal-title">📦 Hacer Inventario</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInventario(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>
              <div className="form-group">
                <label className="form-label">Escanear Código de Barras</label>
                <input
                  ref={barcodeRef}
                  type="text"
                  className="form-input"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  placeholder="Apunta la pistola aquí y escanea..."
                  autoComplete="off"
                />
                {barcodeError && (
                  <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{barcodeError}</div>
                )}
              </div>

              {scanned.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="empty-icon">📷</div>
                  <p>Escanea productos para ir armando el inventario</p>
                </div>
              ) : (
                <table style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Barcode</th>
                      <th style={{ textAlign: "center" }}>Escaneados</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanned.map((s) => (
                      <tr key={s.product.id}>
                        <td style={{ fontWeight: 500 }}>{s.product.name}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{s.product.barcode}</td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" style={{ padding: "2px 10px" }}
                              onClick={() => setScanned((prev) => prev.map((x) => x.product.id === s.product.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>−</button>
                            <span style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>{s.qty}</span>
                            <button className="btn btn-secondary btn-sm" style={{ padding: "2px 10px" }}
                              onClick={() => setScanned((prev) => prev.map((x) => x.product.id === s.product.id ? { ...x, qty: x.qty + 1 } : x))}>+</button>
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => setScanned((prev) => prev.filter((x) => x.product.id !== s.product.id))}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
                {scanned.length} producto{scanned.length !== 1 ? "s" : ""} · {scanned.reduce((s, x) => s + x.qty, 0)} unidades
              </div>
              <button className="btn btn-secondary" onClick={() => setShowInventario(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirmInventario} disabled={scanned.length === 0 || savingInventario}>
                {savingInventario ? "Guardando..." : "✅ Confirmar Inventario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
