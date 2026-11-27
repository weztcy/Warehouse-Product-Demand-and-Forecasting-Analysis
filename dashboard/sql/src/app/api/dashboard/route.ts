import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const warehouse = req.nextUrl.searchParams.get("warehouse");
    const year = req.nextUrl.searchParams.get("year");
    const payload = await getDashboardData(warehouse, year);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("Dashboard query error:", err);
    return NextResponse.json(
      { error: "Gagal memuat ringkasan data permintaan." },
      { status: 500 }
    );
  }
}
