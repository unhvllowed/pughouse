export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CashFlow } from "@prisma/client";

import { getCashFlowData } from "@/lib/services/cashflow";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const fromParam = searchParams.get("from"); // YYYY-MM-DD
  const toParam = searchParams.get("to");     // YYYY-MM-DD

  const data = await getCashFlowData(month, fromParam, toParam);
  return NextResponse.json(data);
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
