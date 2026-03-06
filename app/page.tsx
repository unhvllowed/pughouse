"use client";

import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";

interface Summary {
  totalInventario: number;
  ventasHoy: number;
  balance: number;
  stockBajo: number;
}

interface Transaction {
  id: number;
  type: string;
  total: number;
  date: string;
  note: string;
  items: { product: { name: string }; quantity: number }[];
}

function formatCLP(n: any) {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return "$—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(num);
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [invRes, txRes, cfRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/transactions?limit=6"),
          fetch(`/api/cashflow?month=${new Date().toISOString().slice(0, 7)}`),
        ]);
        if (!invRes.ok || !txRes.ok || !cfRes.ok) {
          throw new Error("Error fetching dashboard data");
        }

        const inv = await invRes.json();
        const { transactions: txs } = await txRes.json();
        const { summary: cf } = await cfRes.json();

        const totalInventario = inv.reduce(
          (s: number, i: { quantity: number; sellPrice: number }) => s + (i.quantity || 0) * (i.sellPrice || 0),
          0
        );
        const stockBajo = inv.filter((i: { quantity: number; minStock: number }) => i.quantity <= i.minStock).length;

        const hoy = new Date().toDateString();
        const ventasHoy = txs
          .filter((t: Transaction) => t.type === "VENTA" && new Date(t.date).toDateString() === hoy)
          .reduce((s: number, t: Transaction) => s + t.total, 0);

        setSummary({ totalInventario, ventasHoy, balance: cf.balance, stockBajo });
        setTransactions(txs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpis = [
    {
      label: "Valor del Inventario",
      value: summary ? formatCLP(summary.totalInventario) : "...",
      icon: "📦",
      color: "var(--blue)",
      bg: "var(--blue-light)",
      sub: "valoración total a precio de venta",
    },
    {
      label: "Ventas de Hoy",
      value: summary ? formatCLP(summary.ventasHoy) : "...",
      icon: "💳",
      color: "var(--green)",
      bg: "var(--green-light)",
      sub: "ingresos del día",
    },
    {
      label: "Balance del Mes",
      value: summary ? formatCLP(summary.balance) : "...",
      icon: "💰",
      color: "var(--accent)",
      bg: "var(--accent-light)",
      sub: "flujo de caja mensual",
    },
    {
      label: "Stock Bajo",
      value: summary ? String(summary.stockBajo) : "...",
      icon: "⚠️",
      color: "var(--yellow)",
      bg: "var(--yellow-light)",
      sub: "productos con stock crítico",
    },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="main-header">
          <h2>🏠 Dashboard</h2>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="page-content">
          <div className="kpi-grid">
            {kpis.map((k) => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-icon" style={{ background: k.bg, color: k.color }}>
                  {k.icon}
                </div>
                <div className="kpi-info">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ color: k.color }}>
                    {loading ? <span className="skeleton" style={{ display: "inline-block", width: 120, height: 28 }} /> : k.value}
                  </div>
                  <div className="kpi-sub">{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="section-header">
            <h3 className="section-title">📋 Movimientos Recientes</h3>
          </div>

          <div className="table-container">
            {transactions.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-icon">🧾</div>
                <h3>Sin movimientos</h3>
                <p>Las transacciones registradas aparecerán aquí</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Fecha</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className={`badge ${tx.type === "VENTA" ? "badge-green" : tx.type === "COMPRA" ? "badge-blue" : "badge-yellow"}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="text-secondary">
                        {tx.items.map((i) => `${i.product.name} x${i.quantity}`).join(", ")}
                      </td>
                      <td className="text-green" style={{ fontWeight: 600 }}>{formatCLP(tx.total)}</td>
                      <td className="text-muted">{new Date(tx.date).toLocaleDateString("es-CL")}</td>
                      <td className="text-muted">{tx.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
