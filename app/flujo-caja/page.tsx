"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell, ReferenceLine, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";

interface CashFlowEntry {
  id: number; type: string; amount: number; category: string;
  date: string; description: string; reference: string;
}
interface Summary { ingresos: number; egresos: number; balance: number }
interface MonthlyData { mes: string; Ingresos: number; Egresos: number; Balance: number }
interface DailyDelta { dia: string; Balance: number; Ingresos: number; Egresos: number }
interface TopProduct { name: string; type: string; qty: number; revenue: number }

function formatCLP(n: unknown) {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return "$—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(num);
}

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CATEGORIAS_INGRESO = ["Venta de cartas", "Venta de sobres", "Venta de cajas", "Accesorios", "Torneo", "Otro"];
const CATEGORIAS_EGRESO = ["Compra de stock", "Arriendo", "Servicios", "Transporte", "Marketing", "Otro"];
const PIE_COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#4f46e5", "#818cf8", "#6366f1"];

function getLast7Months() {
  const months = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
    });
  }
  return months;
}

export default function FlujoCajaPage() {
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({ ingresos: 0, egresos: 0, balance: 0 });
  const [dailyDelta, setDailyDelta] = useState<DailyDelta[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  // Period for table/KPIs (month)
  const [selectedMonth, setSelectedMonth] = useState(toLocalDate(new Date()).slice(0, 7));

  // Delta chart: "start date" = anchor day, always shows [startDate - 6 days, startDate]
  const [deltaEnd, setDeltaEnd] = useState(toLocalDate(new Date()));

  // Excel export modal
  const [showExcel, setShowExcel] = useState(false);
  const [excelMonth, setExcelMonth] = useState(toLocalDate(new Date()).slice(0, 7));

  // Register movement modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: "INGRESO", amount: "", category: "", description: "", reference: "", date: toLocalDate(new Date()) });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const last7Months = getLast7Months();

  // Compute the 7-day range from deltaEnd
  const deltaFrom = toLocalDate(new Date(new Date(deltaEnd).getTime() - 6 * 864e5));

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/cashflow?month=${selectedMonth}&from=${deltaFrom}&to=${deltaEnd}`);
    const data = await res.json();
    setEntries(data.entries || []);
    setSummary(data.summary || { ingresos: 0, egresos: 0, balance: 0 });
    setDailyDelta(data.dailyDelta || []);
    setMonthlyComparison(data.monthlyComparison || []);
    setTopProducts(data.topProducts || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [selectedMonth, deltaEnd]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/cashflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ type: "INGRESO", amount: "", category: "", description: "", reference: "", date: toLocalDate(new Date()) });
    load();
  };

  function downloadExcel() {
    // Filter entries for selected export month
    const filtered = entries.filter((e) => e.date.startsWith(excelMonth));
    const rows = filtered.map((e) => ({
      Fecha: new Date(e.date).toLocaleDateString("es-CL"),
      Tipo: e.type,
      Categoría: e.category,
      Monto: e.amount,
      Descripción: e.description || "",
      Referencia: e.reference || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flujo de Caja");
    XLSX.writeFile(wb, `flujo-caja-${excelMonth}.xlsx`);
    setShowExcel(false);
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="main-header">
          <h2>💰 Flujo de Caja</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowExcel(true)}>⬇ Excel</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Registrar Movimiento</button>
          </div>
        </div>

        <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* KPIs + month selector inline */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 0 }}>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "var(--green-light)", color: "var(--green)" }}>💲</div>
              <div className="kpi-info"><div className="kpi-label">Ingresos del período</div><div className="kpi-value text-green">{formatCLP(summary.ingresos)}</div></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "var(--red-light)", color: "var(--red)" }}>⛔</div>
              <div className="kpi-info"><div className="kpi-label">Egresos del período</div><div className="kpi-value text-red">{formatCLP(summary.egresos)}</div></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>💰</div>
              <div className="kpi-info">
                <div className="kpi-label">Balance</div>
                <div className={`kpi-value ${summary.balance >= 0 ? "text-green" : "text-red"}`}>{formatCLP(summary.balance)}</div>
              </div>
            </div>
          </div>

          {/* Balance Neto — single end-date picker, always shows 7 days */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 2 }}>📊 Balance Neto por Día</h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(deltaFrom + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                  {" → "}
                  {new Date(deltaEnd + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Hasta el</span>
                <input
                  type="date"
                  className="form-input"
                  value={deltaEnd}
                  max={toLocalDate(new Date())}
                  onChange={(e) => setDeltaEnd(e.target.value)}
                  style={{ width: 150, padding: "4px 8px", fontSize: 12 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => setDeltaEnd(toLocalDate(new Date()))}
                  title="Volver a hoy"
                >Hoy</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyDelta} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} tickFormatter={(v) => `$${Math.abs(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "#ffffff" }}
                  labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                  itemStyle={{ color: "#ffffff" }}
                  formatter={(v: unknown) => {
                    const n = v as number;
                    return [formatCLP(Math.abs(n)), n >= 0 ? "✅ Ganancia" : "🔴 Pérdida"];
                  }}
                  labelFormatter={(label) => <span style={{ color: "#ffffff" }}>{label}</span>}
                />
                <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="4 4" />
                <Bar dataKey="Balance" name="Balance Neto" radius={[4, 4, 4, 4]}>
                  {dailyDelta.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.Balance >= 0 ? "var(--green)" : "var(--red)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Comparison + Top Products */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 20 }}>📈 Comparativa Mensual (7 meses)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyComparison} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }}
                    formatter={(v: unknown) => formatCLP(v as number)}
                  />
                  <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                  <Bar dataKey="Ingresos" fill="var(--green)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Egresos" fill="var(--red)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={monthlyComparison}>
                    <Line type="monotone" dataKey="Balance" stroke="var(--accent)" strokeWidth={2} dot={{ fill: "var(--accent)", r: 3 }} />
                    <ReferenceLine y={0} stroke="var(--border)" />
                    <XAxis dataKey="mes" hide />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12 }}
                      formatter={(v: unknown) => [formatCLP(v as number), "Balance"]}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Tendencia de balance</div>
              </div>
            </div>

            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 20 }}>🥧 Productos Más Vendidos</h3>
              {topProducts.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">📦</div><h3>Sin ventas</h3></div>
              ) : (
                <div style={{ display: "flex", gap: 16 }}>
                  <ResponsiveContainer width="55%" height={240}>
                    <PieChart>
                      <Pie data={topProducts} dataKey="qty" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                        {topProducts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12 }}
                        formatter={(v: unknown) => [`${v} uds.`, "Vendidos"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                    {topProducts.map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{p.name}</div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>{p.qty}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="table-container">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <h3 className="section-title">📋 Movimientos del Período</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Mes:</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {last7Months.map((m) => (
                    <button
                      key={m.value}
                      className={`btn btn-sm ${selectedMonth === m.value ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "3px 10px", fontSize: 11 }}
                      onClick={() => setSelectedMonth(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{entries.length} registro{entries.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
            ) : entries.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">💸</div><h3>Sin movimientos</h3><p>No hay registros para este período</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Categoría</th><th>Monto</th><th>Fecha</th><th>Descripción</th><th>Referencia</th></tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td><span className={`badge ${e.type === "INGRESO" ? "badge-green" : "badge-red"}`}>{e.type}</span></td>
                      <td><span className="badge badge-gray">{e.category}</span></td>
                      <td className={e.type === "INGRESO" ? "text-green" : "text-red"} style={{ fontWeight: 600 }}>{formatCLP(e.amount)}</td>
                      <td className="text-muted">{new Date(e.date).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="text-secondary">{e.description || "—"}</td>
                      <td className="text-muted">{e.reference || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Excel Export Modal */}
      {showExcel && (
        <div className="modal-overlay" onClick={() => setShowExcel(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">⬇ Descargar Excel</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowExcel(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Seleccionar mes</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {last7Months.map((m) => (
                    <button
                      key={m.value}
                      className={`btn btn-sm ${excelMonth === m.value ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "4px 12px", fontSize: 12 }}
                      onClick={() => setExcelMonth(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
                Se exportarán todos los movimientos de <strong>{last7Months.find(m => m.value === excelMonth)?.label}</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExcel(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={downloadExcel}>⬇ Descargar</button>
            </div>
          </div>
        </div>
      )}

      {/* Register Movement Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Registrar Movimiento</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["INGRESO", "EGRESO"].map((t) => (
                    <button key={t} className={`btn ${form.type === t ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => setForm({ ...form, type: t, category: "" })}>
                      {t === "INGRESO" ? "💲 Ingreso" : "⛔ Egreso"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Monto (CLP)</label>
                  <input type="number" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Seleccionar categoría...</option>
                  {(form.type === "INGRESO" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input type="text" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción del movimiento..." />
              </div>
              <div className="form-group">
                <label className="form-label">Referencia (opcional)</label>
                <input type="text" className="form-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="N° boleta, factura, etc." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.amount || !form.category}>
                {saving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
