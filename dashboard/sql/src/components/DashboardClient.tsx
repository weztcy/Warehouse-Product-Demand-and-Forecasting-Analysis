"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarRange,
  CheckCircle2,
  Compass,
  Filter,
  Layers,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import type { DashboardPayload } from "@/lib/db";
import {
  CategoryParetoChart,
  MonthlyTrendForecastChart,
  SeasonalityHeatmap,
  YearlyBarChart,
  formatIdUnits,
} from "@/components/Charts";

interface Props {
  initialData: DashboardPayload;
}

const WAREHOUSE_OPTIONS = [
  { value: "ALL", label: "Semua Gudang (4)" },
  { value: "Whse_J", label: "Whse_J (Utama)" },
  { value: "Whse_S", label: "Whse_S" },
  { value: "Whse_C", label: "Whse_C" },
  { value: "Whse_A", label: "Whse_A" },
];

const YEAR_OPTIONS = [
  { value: "ALL", label: "2012–2016 (Penuh)" },
  { value: "2012", label: "2012" },
  { value: "2013", label: "2013" },
  { value: "2014", label: "2014" },
  { value: "2015", label: "2015" },
  { value: "2016", label: "2016" },
];

const NAV_ITEMS = [
  { id: "ringkasan", label: "Ringkasan Eksekutif", icon: Compass },
  { id: "tren", label: "Tren & Proyeksi 2017", icon: Activity },
  { id: "gudang-kategori", label: "Gudang & Kategori", icon: Warehouse },
  { id: "segmentasi", label: "Segmentasi ABC-XYZ", icon: Boxes },
  { id: "akurasi-kualitas", label: "Akurasi & Kualitas Data", icon: CheckCircle2 },
  { id: "rekomendasi", label: "Wawasan & Rekomendasi", icon: Layers },
];

export default function DashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DashboardPayload>(initialData);
  const [warehouse, setWarehouse] = useState<string>(initialData.filters.warehouse);
  const [year, setYear] = useState<string>(initialData.filters.year);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>("ringkasan");

  async function applyFilters(nextWh: string, nextYr: string) {
    setWarehouse(nextWh);
    setYear(nextYr);
    setLoading(true);
    try {
      const params = new URLSearchParams({ warehouse: nextWh, year: nextYr });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as DashboardPayload;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }

  const { kpi } = data;

  return (
    <div id="dashboard-root" className="flex min-h-screen bg-[#070b12] text-slate-100">
      {/* Sidebar SPA Navigation */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-800/90 bg-[#0b111d] p-5 lg:flex">
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300">
              <BarChart3 className="h-3.5 w-3.5" />
              Ringkasan Operasional
            </div>
            <h2 className="mt-3 text-sm font-bold leading-snug text-white">
              Warehouse Product Demand and Forecasting Analysis
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Periode Penuh: 2012–2016
              <br />
              Proyeksi Baseline: 2017
            </p>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveNav(item.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "border border-sky-500/30 bg-sky-500/15 text-sky-300"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101829] p-3.5 text-[11px] leading-relaxed text-slate-400">
          <div className="font-semibold text-slate-200">Konteks Rekonsiliasi Data</div>
          <p className="mt-1">
            1.048.575 baris historis telah dipilah antara transaksi penuh (2012–2016: 99,85% volume), catatan parsial (2011 &amp; Jan 2017), dan 11.239 baris tanpa tanggal di Whse_A.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 px-6 py-6 md:px-8">
        {/* Top Header + Global Filter Bar */}
        <header
          id="ringkasan"
          className="flex flex-col gap-4 border-b border-slate-800 pb-6 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                Periode Penuh 2012–2016 · Proyeksi 2017
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[11px] text-slate-300">
                Sumber: Historical Product Demand (1.048.575 Baris)
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Warehouse Product Demand and Forecasting Analysis
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Evaluasi permintaan bersih lintas 4 gudang dan 33 kategori produk, segmentasi prediktabilitas SKU, uji akurasi peramalan 2016, serta proyeksi 2017.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0e1522] px-3 py-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-slate-400">Gudang:</span>
              <select
                aria-label="Filter Gudang"
                value={warehouse}
                onChange={(e) => applyFilters(e.target.value, year)}
                className="bg-transparent font-medium text-slate-100 focus:outline-none"
              >
                {WAREHOUSE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-slate-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0e1522] px-3 py-1.5 text-xs">
              <CalendarRange className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-slate-400">Tahun:</span>
              <select
                aria-label="Filter Tahun"
                value={year}
                onChange={(e) => applyFilters(warehouse, e.target.value)}
                className="bg-transparent font-medium text-slate-100 focus:outline-none"
              >
                {YEAR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-slate-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {loading && <span className="text-xs text-sky-400">Memperbarui...</span>}
          </div>
        </header>

        {/* 5 KPI Cards */}
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="Total Net Demand"
            value={formatIdUnits(kpi.netDemand)}
            detail={`Gross ${formatIdUnits(kpi.grossDemand)} · Retur ${formatIdUnits(kpi.returnUnits)} (${kpi.returnRatePct.toFixed(2)}%)`}
            badge={`${kpi.orderLines.toLocaleString("id-ID")} baris`}
            tone="sky"
          />
          <KpiCard
            title="Perubahan YoY Terakhir"
            value={
              kpi.yoyChangePct !== null
                ? `${kpi.yoyChangePct > 0 ? "+" : ""}${kpi.yoyChangePct.toFixed(2)}%`
                : "Tahun Basis"
            }
            detail={
              warehouse === "ALL" && year === "ALL"
                ? "Kontraksi 2016 terutama dipicu Whse_S (-41,28%)"
                : `Pertumbuhan tahunan pada filter aktif`
            }
            badge={year === "ALL" ? "2015 → 2016" : `Tahun ${year}`}
            tone={kpi.yoyChangePct !== null && kpi.yoyChangePct < 0 ? "rose" : "emerald"}
            trendIcon={kpi.yoyChangePct !== null && kpi.yoyChangePct < 0 ? "down" : "up"}
          />
          <KpiCard
            title="Konsentrasi SKU Class A"
            value={`${kpi.classADemandPct.toFixed(2)}%`}
            detail={`${kpi.classASkus} SKU teratas (3,89% dari 2.160 SKU) menguasai 4,07 Miliar unit`}
            badge="Pareto 80/20"
            tone="amber"
          />
          <KpiCard
            title="Akurasi Backtest 2016"
            value={`WAPE ${kpi.bestModelWapePct.toFixed(2)}%`}
            detail={`Model terbaik: ${kpi.bestModelName} (Bias ${kpi.bestModelBiasPct > 0 ? "+" : ""}${kpi.bestModelBiasPct.toFixed(2)}%)`}
            badge="Holdout 12 Bln"
            tone="emerald"
          />
          <KpiCard
            title="Proyeksi Baseline 2017"
            value={formatIdUnits(kpi.forecast2017Total)}
            detail={`Pita ketidakpastian: ${formatIdUnits(kpi.forecast2017Lower)} s.d. ${formatIdUnits(kpi.forecast2017Upper)}`}
            badge="Basis H2 2016"
            tone="cyan"
          />
        </section>

        {/* Section 2: Trend & Forecast 2017 */}
        <section id="tren" className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Tren Permintaan Bulanan (2012–2016), Backtest 2016 &amp; Proyeksi 2017
                </h2>
                <p className="text-xs text-slate-400">
                  Garis putus-putus hijau menunjukkan proyeksi musiman 2017 beserta pita deviasi historis berbasis WAPE gudang.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Aktual Net
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Backtest Hybrid
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Proyeksi 2017
                </span>
              </div>
            </div>
            <MonthlyTrendForecastChart data={data.monthlySeries} height={265} />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-4">
            <h2 className="text-base font-semibold text-white">
              Kinerja Tahunan &amp; Pertumbuhan YoY
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              Puncak volume tercapai pada 2015 (1,10 Miliar unit) sebelum terkontraksi -10,05% di 2016.
            </p>
            <YearlyBarChart data={data.yearlyTrend} height={205} />
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-xs">
              <div>
                <div className="text-slate-400">SKU Aktif Terfilter</div>
                <div className="font-semibold text-slate-100 tabular-nums">
                  {kpi.activeSkus.toLocaleString("id-ID")} SKU
                </div>
              </div>
              <div>
                <div className="text-slate-400">Kategori Aktif</div>
                <div className="font-semibold text-slate-100 tabular-nums">
                  {kpi.activeCategories} Kategori
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Warehouses, Pareto Category & Seasonality */}
        <section id="gudang-kategori" className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-6">
            <h2 className="text-base font-semibold text-white">
              Perbandingan Kinerja Gudang, Rasio Retur &amp; Proyeksi 2017
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Whse_J mendominasi 65,53% volume dan paling akurat diramalkan (WAPE 6,66%), sedangkan Whse_A mencatat rasio retur tertinggi (5,22%).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="pb-2">Gudang</th>
                    <th className="pb-2 text-right">Net Total</th>
                    <th className="pb-2 text-right">Porsi</th>
                    <th className="pb-2 text-right">Retur (%)</th>
                    <th className="pb-2 text-right">Aktual 2016</th>
                    <th className="pb-2 text-right">Proyeksi 2017</th>
                    <th className="pb-2 text-right">WAPE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {data.warehouses.map((w) => (
                    <tr key={w.warehouse} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-semibold text-white">{w.warehouse}</td>
                      <td className="py-2.5 text-right text-slate-200">{formatIdUnits(w.total_net_demand)}</td>
                      <td className="py-2.5 text-right text-sky-300">{w.share_pct.toFixed(2)}%</td>
                      <td
                        className={`py-2.5 text-right ${
                          w.return_rate_pct > 1 ? "font-semibold text-rose-300" : "text-slate-300"
                        }`}
                      >
                        {w.return_rate_pct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 text-right text-slate-300">{formatIdUnits(w.net_demand_2016)}</td>
                      <td className="py-2.5 text-right text-emerald-300">{formatIdUnits(w.forecast_demand_2017)}</td>
                      <td className="py-2.5 text-right font-medium text-amber-300">{w.hybrid_wape_pct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                Heatmap Indeks Musiman Bulanan per Gudang (2012–2016)
              </h3>
              <SeasonalityHeatmap data={data.seasonality} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-6">
            <h2 className="text-base font-semibold text-white">
              Konsentrasi Pareto Kategori Produk (Top 7 dari 33 Kategori)
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Empat kategori teratas (Category_019, 006, 005, 007) menggerakkan 96,93% total permintaan bersih.
            </p>
            <CategoryParetoChart data={data.categories} />
          </div>
        </section>

        {/* Section 4: ABC-XYZ & Syntetos-Boylan */}
        <section id="segmentasi" className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-5">
            <h2 className="text-base font-semibold text-white">
              Segmentasi Prediktabilitas Syntetos–Boylan &amp; ABC
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              639 SKU berpola Smooth (29,58% SKU) menyumbang 89,60% total volume, sementara 1.414 SKU Erratic &amp; Lumpy hanya mewakili 9,93% volume.
            </p>
            <div className="space-y-2.5">
              {data.patterns.map((p) => (
                <div
                  key={p.demand_pattern}
                  className="rounded-xl border border-slate-800 bg-[#121b2d] p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{p.demand_pattern}</span>
                    <span className="font-mono text-sky-300 tabular-nums">
                      {p.demand_share_pct.toFixed(2)}% volume ({formatIdUnits(p.net_demand)})
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        p.demand_pattern === "Smooth"
                          ? "bg-emerald-400"
                          : p.demand_pattern === "Erratic"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      }`}
                      style={{ width: `${Math.max(p.demand_share_pct, 2)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 tabular-nums">
                    <span>
                      {p.sku_count} SKU ({p.sku_share_pct.toFixed(2)}%)
                    </span>
                    <span>
                      Rata-rata CV: {p.avg_cv} · ADI: {p.avg_adi} bln
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-7">
            <h2 className="text-base font-semibold text-white">
              Peringkat Top 12 SKU &amp; Profil Volatilitas (2012–2016)
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              Seluruh SKU utama tergolong Class A dan beroperasi aktif penuh selama 59–60 bulan berturut-turut.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Kategori</th>
                    <th className="pb-2">Gudang</th>
                    <th className="pb-2">Segmen</th>
                    <th className="pb-2">Pola</th>
                    <th className="pb-2 text-right">Net Demand</th>
                    <th className="pb-2 text-right">Porsi</th>
                    <th className="pb-2 text-right">CV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {data.topSkus.map((s) => (
                    <tr key={s.product_code} className="hover:bg-slate-800/30">
                      <td className="py-2 font-mono font-semibold text-slate-100">{s.product_code}</td>
                      <td className="py-2 text-slate-300">{s.product_category}</td>
                      <td className="py-2 text-slate-300">{s.primary_warehouse}</td>
                      <td className="py-2">
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] text-amber-300">
                          {s.abc_class}-{s.xyz_class}
                        </span>
                      </td>
                      <td className="py-2 text-emerald-300">{s.demand_pattern}</td>
                      <td className="py-2 text-right text-slate-100">{formatIdUnits(s.total_net_demand)}</td>
                      <td className="py-2 text-right text-sky-300">{s.demand_share_pct.toFixed(2)}%</td>
                      <td className="py-2 text-right text-slate-300">{s.cv_60m.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 5: Backtest Benchmark & Data Quality */}
        <section id="akurasi-kualitas" className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-6">
            <h2 className="text-base font-semibold text-white">
              Uji Akurasi Model Backtest Out-of-Sample 2016
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              Evaluasi 12 bulan 2016 menggunakan riwayat 2012–2015: model rata-rata bergerak 6 bulan &amp; hibrida musiman memangkas error ~8 poin dibanding Seasonal Naive.
            </p>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="pb-2">Metode Peramalan</th>
                  <th className="pb-2 text-right">WAPE (%)</th>
                  <th className="pb-2 text-right">MAE</th>
                  <th className="pb-2 text-right">RMSE</th>
                  <th className="pb-2 text-right">Bias (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.benchmark.map((b, i) => (
                  <tr key={b.model_name} className={i === 0 ? "bg-emerald-500/5" : ""}>
                    <td className="py-2.5 font-medium text-white">{b.model_name}</td>
                    <td className={`py-2.5 text-right font-semibold ${i <= 1 ? "text-emerald-300" : "text-slate-300"}`}>
                      {b.wape_pct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 text-right text-slate-300">{formatIdUnits(b.mae)}</td>
                    <td className="py-2.5 text-right text-slate-300">{formatIdUnits(b.rmse)}</td>
                    <td className={`py-2.5 text-right ${b.bias_pct > 5 ? "font-semibold text-rose-300" : "text-slate-300"}`}>
                      {b.bias_pct > 0 ? "+" : ""}
                      {b.bias_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Ringkasan Kualitas Data &amp; Anomali per Gudang
                </h2>
                <p className="text-xs text-slate-400">
                  Seluruh 11.239 baris tanpa tanggal berasal dari Whse_A dan memuat 70,7% volume retur Whse_A.
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="pb-2">Gudang</th>
                  <th className="pb-2 text-right">Total Baris</th>
                  <th className="pb-2 text-right">Tanpa Tgl</th>
                  <th className="pb-2 text-right">Retur (Kurung)</th>
                  <th className="pb-2 text-right">Nilai Nol</th>
                  <th className="pb-2 text-right">Berulang 5-Kol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.dataQuality.map((dq) => (
                  <tr key={dq.warehouse}>
                    <td className="py-2.5 font-semibold text-white">{dq.warehouse}</td>
                    <td className="py-2.5 text-right text-slate-200">{dq.total_rows.toLocaleString("id-ID")}</td>
                    <td className={`py-2.5 text-right ${dq.missing_date_rows > 0 ? "font-semibold text-rose-300" : "text-slate-400"}`}>
                      {dq.missing_date_rows.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 text-right text-amber-300">{dq.parenthesized_rows.toLocaleString("id-ID")}</td>
                    <td className="py-2.5 text-right text-slate-300">{dq.zero_demand_rows.toLocaleString("id-ID")}</td>
                    <td className="py-2.5 text-right text-slate-400">{dq.repeated_5col_rows.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6: Insights & Recommendations */}
        <section id="rekomendasi" className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-6">
            <h2 className="text-base font-semibold text-white">
              Temuan Bisnis Utama (Berbasis Bukti)
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-300">
              <li className="rounded-xl border border-slate-800/80 bg-[#121b2d] p-3">
                <strong className="text-sky-300">1. Konsentrasi Ekstrem pada SKU A-X Smooth:</strong>{" "}
                Hanya 84 SKU Class A (3,89% SKU) menghasilkan 79,81% volume, dan 57 SKU A-X Smooth (2,64% SKU) menyumbang 63,41% permintaan bersih dengan CV rata-rata 0,30.
              </li>
              <li className="rounded-xl border border-slate-800/80 bg-[#121b2d] p-3">
                <strong className="text-rose-300">2. Kontraksi 2016 Terpusat di Whse_S (-41,28%):</strong>{" "}
                Penurunan total jaringan -10,05% pada 2016 hampir seluruhnya berasal dari Whse_S (baris pesanan turun 67% dan retur melonjak 6,1x), sementara Whse_C justru tumbuh +4,55% dan Whse_J relatif stabil (-2,16%).
              </li>
              <li className="rounded-xl border border-slate-800/80 bg-[#121b2d] p-3">
                <strong className="text-emerald-300">3. Model Adaptif 6 Bulan Mengalahkan Naive Musiman:</strong>{" "}
                Moving Average 6M (WAPE 11,21%) dan Seasonal-MA6 Hybrid (WAPE 11,29%) menghindari over-forecast +11,17% milik Seasonal Naive (t-12) saat terjadi pergeseran level permintaan.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0e1522] p-5 xl:col-span-6">
            <h2 className="text-base font-semibold text-white">
              Rekomendasi Strategis &amp; Konteks Batasan
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-300">
              <li className="rounded-xl border border-slate-800/80 bg-[#121b2d] p-3">
                <strong className="text-emerald-300">Aksi 1 — Perencanaan Berdiferensiasi:</strong>{" "}
                Terapkan peramalan otomatis bulanan berbasis Seasonal-MA6 Hybrid untuk 639 SKU Smooth (89,60% volume), dan alihkan 1.414 SKU Erratic/Lumpy ke kebijakan stok berbasis kuantil/Min-Max.
              </li>
              <li className="rounded-xl border border-slate-800/80 bg-[#121b2d] p-3">
                <strong className="text-amber-300">Aksi 2 — Audit Operasional Whse_A &amp; Whse_S:</strong>{" "}
                Wajibkan validasi stempel tanggal pada transaksi penyesuaian di Whse_A (11.239 baris tanpa tanggal; rasio retur 5,22%) dan lakukan tinjauan akun pelanggan pada Whse_S.
              </li>
              <li className="rounded-xl border border-slate-800/80 bg-[#121b2d] p-3">
                <strong className="text-slate-200">Batasan &amp; Definisi:</strong>{" "}
                Analisis ABC berbasis unit (tidak ada data harga/biaya); total 1.048.575 baris menandakan potensi batas ekspor spreadsheet; korelasi historis tidak membuktikan hubungan kausal.
              </li>
            </ul>
          </div>
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
          <span>
            Warehouse Product Demand and Forecasting Analysis · Cakupan Penuh 2012–2016 (60 Bulan) · 2.160 SKU · 33 Kategori · 4 Gudang
          </span>
          <span className="tabular-nums">
            Rekonsiliasi Sumber: 1.048.575 Baris · Gross 5,12 Miliar − Retur 20,74 Juta = Net 5,10 Miliar Unit
          </span>
        </footer>
      </main>
    </div>
  );
}

function KpiCard({
  title,
  value,
  detail,
  badge,
  tone,
  trendIcon,
}: {
  title: string;
  value: string;
  detail: string;
  badge: string;
  tone: "sky" | "emerald" | "amber" | "rose" | "cyan";
  trendIcon?: "up" | "down";
}) {
  const toneMap = {
    sky: "border-sky-500/25 text-sky-300 bg-sky-500/10",
    emerald: "border-emerald-500/25 text-emerald-300 bg-emerald-500/10",
    amber: "border-amber-500/25 text-amber-300 bg-amber-500/10",
    rose: "border-rose-500/25 text-rose-300 bg-rose-500/10",
    cyan: "border-cyan-500/25 text-cyan-300 bg-cyan-500/10",
  };
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0e1522] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${toneMap[tone]}`}>
          {badge}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-2xl font-bold tracking-tight text-white tabular-nums">
        <span>{value}</span>
        {trendIcon === "down" && <TrendingDown className="h-5 w-5 text-rose-400" />}
        {trendIcon === "up" && <TrendingUp className="h-5 w-5 text-emerald-400" />}
      </div>
      <p className="mt-2 text-xs leading-snug text-slate-400">{detail}</p>
    </div>
  );
}
