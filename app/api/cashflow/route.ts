export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CashFlow } from "@prisma/client";

// Helper: parse YYYY-MM-DD into UTC timestamp boundaries
function dayBoundsUTC(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const end = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

// Helper: get YYYY-MM-DD in LOCAL timezone
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const fromParam = searchParams.get("from"); // YYYY-MM-DD
  const toParam = searchParams.get("to");     // YYYY-MM-DD

  // ── Fetch ALL cash flow records (small dataset, safe) ─────────────────────
  const all = await prisma.cashFlow.findMany({ orderBy: { date: "desc" } });

  // ── Filter for entries table/KPIs by month ─────────────────────────────────
  let entries: CashFlow[] = all;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = Date.UTC(y, m - 1, 1);
    const end = Date.UTC(y, m, 0, 23, 59, 59, 999); // last day of month
    entries = all.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    });
  }

  const totalIngresos = entries.filter((e) => e.type === "INGRESO").reduce((s, e) => s + e.amount, 0);
  const totalEgresos = entries.filter((e) => e.type === "EGRESO").reduce((s, e) => s + e.amount, 0);

  // ── Build daily delta: from/to range, walking day by day ─────────────────
  const today = new Date();
  const fromStr = fromParam ?? localDateStr(new Date(Date.now() - 6 * 864e5));
  const toStr = toParam ?? localDateStr(today);

  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);

  const dailyDelta = [];
  const cursor = new Date(fy, fm - 1, fd);
  const endDate = new Date(ty, tm - 1, td, 23, 59, 59, 999);

  while (cursor <= endDate) {
    const dayStr = localDateStr(cursor);
    const { start, end } = dayBoundsUTC(dayStr);
    const dayEntries = all.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    });
    const ing = dayEntries.filter((e) => e.type === "INGRESO").reduce((s, e) => s + e.amount, 0);
    const eg = dayEntries.filter((e) => e.type === "EGRESO").reduce((s, e) => s + e.amount, 0);
    dailyDelta.push({
      dia: cursor.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }),
      Balance: ing - eg,
      Ingresos: ing,
      Egresos: eg,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Monthly comparison: last 7 months ─────────────────────────────────────
  const monthlyComparison = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const start = Date.UTC(d.getFullYear(), d.getMonth(), 1);
    const end = Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const mEntries = all.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    });
    const mIng = mEntries.filter((e) => e.type === "INGRESO").reduce((s, e) => s + e.amount, 0);
    const mEg = mEntries.filter((e) => e.type === "EGRESO").reduce((s, e) => s + e.amount, 0);
    monthlyComparison.push({
      mes: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
      Ingresos: mIng,
      Egresos: mEg,
      Balance: mIng - mEg,
    });
  }

  // ── Top selling products ───────────────────────────────────────────────────
  const soldItems = await prisma.transactionItem.findMany({
    where: { transaction: { type: "VENTA" } },
    include: { product: { select: { name: true, type: true } } },
  });
  const productSales: Record<string, { name: string; type: string; qty: number; revenue: number }> = {};
  for (const item of soldItems) {
    const key = String(item.productId);
    if (!productSales[key]) productSales[key] = { name: item.product.name, type: item.product.type, qty: 0, revenue: 0 };
    productSales[key].qty += item.quantity;
    productSales[key].revenue += item.quantity * item.unitPrice;
  }
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 8);

  return NextResponse.json({
    entries,
    summary: { ingresos: totalIngresos, egresos: totalEgresos, balance: totalIngresos - totalEgresos },
    dailyDelta,
    monthlyComparison,
    topProducts,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await prisma.cashFlow.create({
    data: {
      type: body.type,
      amount: body.amount,
      category: body.category,
      description: body.description,
      reference: body.reference,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
