import Sidebar from "../components/Sidebar";
import CashFlowClient from "./CashFlowClient";
import { getCashFlowData } from "@/lib/services/cashflow";

// Make this route dynamic so it recalculates on every request
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function FlujoCajaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; from?: string; to?: string }>;
}) {
  // Await the searchParams promise (Next.js 15 requirement)
  const resolvedParams = await searchParams;
  
  // Set default bounds
  const today = new Date();
  const defaultMonth = toLocalDate(today).slice(0, 7);
  const defaultTo = toLocalDate(today);
  const defaultFrom = toLocalDate(new Date(today.getTime() - 6 * 864e5));

  const month = resolvedParams.month || defaultMonth;
  const to = resolvedParams.to || defaultTo;
  const from = resolvedParams.from || defaultFrom;

  // Fetch initial data on the server
  const data = await getCashFlowData(month, from, to);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <CashFlowClient 
          initialEntries={data.entries}
          initialSummary={data.summary}
          initialDailyDelta={data.dailyDelta}
          initialMonthlyComparison={data.monthlyComparison}
          initialTopProducts={data.topProducts}
          initialMonth={month}
          initialFrom={from}
          initialTo={to}
        />
      </main>
    </div>
  );
}
