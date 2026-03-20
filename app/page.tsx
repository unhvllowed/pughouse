import Sidebar from "./components/Sidebar";
import { getInventory } from "@/lib/services/inventory";
import { getTransactions } from "@/lib/services/transactions";
import { getCashFlowData } from "@/lib/services/cashflow";

export const dynamic = "force-dynamic";

function formatCLP(n: any) {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return "$—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(num);
}

export default async function DashboardPage() {
  const hoy = new Date();
  const currentMonth = hoy.toISOString().slice(0, 7);

  // Fetch data on the server
  const [inv, { transactions: txs }, cfData] = await Promise.all([
    getInventory(),
    getTransactions({ limit: 6 }),
    getCashFlowData(currentMonth),
  ]);

  const totalInventario = inv.reduce(
    (s, i) => s + (i.quantity || 0) * (i.sellPrice || 0),
    0
  );
  const stockBajo = inv.filter((i) => i.quantity <= i.minStock).length;

  const hoyStr = hoy.toDateString();
  const ventasHoy = txs
    .filter((t) => t.type === "VENTA" && new Date(t.date).toDateString() === hoyStr)
    .reduce((s, t) => s + t.total, 0);

  const kpis = [
    {
      label: "Valor del Inventario",
      value: formatCLP(totalInventario),
      icon: "📦",
      color: "var(--blue)",
      bg: "var(--blue-light)",
      sub: "valoración total a precio de venta",
    },
    {
      label: "Ventas de Hoy",
      value: formatCLP(ventasHoy),
      icon: "💳",
      color: "var(--green)",
      bg: "var(--green-light)",
      sub: "ingresos del día",
    },
    {
      label: "Balance del Mes",
      value: formatCLP(cfData.summary.balance),
      icon: "💰",
      color: "var(--accent)",
      bg: "var(--accent-light)",
      sub: "flujo de caja mensual",
    },
    {
      label: "Stock Bajo",
      value: String(stockBajo),
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
            {hoy.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
                    {k.value}
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
            {txs.length === 0 ? (
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
                  {txs.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className={`badge ${tx.type === "VENTA" ? "badge-green" : tx.type === "COMPRA" ? "badge-blue" : "badge-yellow"}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="text-secondary">
                        {tx.items.map((i: any) => `${i.product.name} x${i.quantity}`).join(", ")}
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
