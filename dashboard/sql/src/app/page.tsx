import React from "react";
import { getDashboardData } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const initialData = await getDashboardData(sp.warehouse, sp.year);
  return <DashboardClient initialData={initialData} />;
}
