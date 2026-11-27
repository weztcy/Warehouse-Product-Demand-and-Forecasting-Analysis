"use client";

import React, { useState } from "react";
import type { DashboardPayload } from "@/lib/db";

export function formatIdUnits(val: number, compact = true): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (!compact) {
    return sign + Math.round(abs).toLocaleString("id-ID");
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2).replace(".", ",")} Miliar`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} Juta`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1).replace(".", ",")} Rb`;
  }
  return sign + Math.round(abs).toLocaleString("id-ID");
}

export function formatAxisShort(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1).replace(".", ",")}M`;
  if (val >= 1_000_000) return `${Math.round(val / 1_000_000)}jt`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
  return String(Math.round(val));
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function MonthlyTrendForecastChart({
  data,
  height = 250,
}: {
  data: DashboardPayload["monthlySeries"];
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data.length) return null;

  const width = 820;
  const padL = 56;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const allVals = data.flatMap((d) =>
    [d.actual_net, d.backtest_hybrid, d.forecast_2017, d.forecast_upper].filter(
      (v): v is number => v !== null && v !== undefined
    )
  );
  const maxVal = Math.max(...allVals, 1) * 1.1;
  const minVal = 0;

  const xFor = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW;
  const yFor = (v: number) =>
    padT + plotH - ((v - minVal) / (maxVal - minVal || 1)) * plotH;

  const buildPath = (getter: (d: (typeof data)[number]) => number | null) => {
    let dStr = "";
    let started = false;
    data.forEach((pt, idx) => {
      const val = getter(pt);
      if (val === null || val === undefined) {
        started = false;
        return;
      }
      const cmd = started ? "L" : "M";
      dStr += `${cmd}${xFor(idx).toFixed(1)},${yFor(val).toFixed(1)} `;
      started = true;
    });
    return dStr.trim();
  };

  // Forecast uncertainty ribbon polygon
  const fcIndices = data
    .map((d, i) => ({ d, i }))
    .filter((x) => x.d.forecast_lower !== null && x.d.forecast_upper !== null);
  let bandPath = "";
  if (fcIndices.length >= 2) {
    const upperPts = fcIndices.map(
      ({ d, i }) => `${xFor(i).toFixed(1)},${yFor(d.forecast_upper!).toFixed(1)}`
    );
    const lowerPts = [...fcIndices]
      .reverse()
      .map(
        ({ d, i }) => `${xFor(i).toFixed(1)},${yFor(d.forecast_lower!).toFixed(1)}`
      );
    bandPath = `M${upperPts.join(" L")} L${lowerPts.join(" L")} Z`;
  }

  // Area under actual line
  const actualPts = data
    .map((d, i) => ({ d, i }))
    .filter((x) => x.d.actual_net !== null);
  let areaPath = "";
  if (actualPts.length >= 2) {
    const top = actualPts
      .map(({ d, i }) => `${xFor(i).toFixed(1)},${yFor(d.actual_net!).toFixed(1)}`)
      .join(" L");
    const firstX = xFor(actualPts[0].i).toFixed(1);
    const lastX = xFor(actualPts[actualPts.length - 1].i).toFixed(1);
    const baseY = (padT + plotH).toFixed(1);
    areaPath = `M${firstX},${baseY} L${top} L${lastX},${baseY} Z`;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + t * (maxVal - minVal));
  const xLabelIndices = data
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => d.month === 1 || i === data.length - 1);

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full select-none overflow-visible"
        role="img"
        aria-label="Grafik tren permintaan bulanan 2012 hingga 2016 dan proyeksi 2017"
      >
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tv, idx) => {
          const y = yFor(tv);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] tabular-nums"
              >
                {formatAxisShort(tv)}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#actualGrad)" />}
        {bandPath && <path d={bandPath} fill="#10b981" fillOpacity="0.14" />}

        <path
          d={buildPath((d) => d.actual_net)}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <path
          d={buildPath((d) => d.backtest_hybrid)}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={1.8}
          strokeDasharray="4 3"
        />
        <path
          d={buildPath((d) => d.forecast_2017)}
          fill="none"
          stroke="#34d399"
          strokeWidth={2.2}
          strokeDasharray="6 3"
        />

        {xLabelIndices.map(({ d, i }) => (
          <text
            key={d.ym}
            x={xFor(i)}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-400 text-[10px] tabular-nums"
          >
            {d.ym}
          </text>
        ))}

        {hoverIdx !== null && (
          <line
            x1={xFor(hoverIdx)}
            y1={padT}
            x2={xFor(hoverIdx)}
            y2={padT + plotH}
            stroke="#475569"
            strokeDasharray="2 2"
          />
        )}

        {data.map((d, i) => (
          <rect
            key={d.ym}
            x={xFor(i) - plotW / Math.max(data.length * 2, 2)}
            y={padT}
            width={plotW / Math.max(data.length, 1)}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-2 right-3 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
          <div className="font-semibold text-slate-100">{hovered.ym}</div>
          {hovered.actual_net !== null && (
            <div className="text-sky-300 tabular-nums">
              Aktual Net: {formatIdUnits(hovered.actual_net)}
            </div>
          )}
          {hovered.backtest_hybrid !== null && (
            <div className="text-amber-300 tabular-nums">
              Backtest Hybrid: {formatIdUnits(hovered.backtest_hybrid)}
            </div>
          )}
          {hovered.forecast_2017 !== null && (
            <div className="text-emerald-300 tabular-nums">
              Proyeksi 2017: {formatIdUnits(hovered.forecast_2017)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function YearlyBarChart({
  data,
  height = 190,
}: {
  data: DashboardPayload["yearlyTrend"];
  height?: number;
}) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.net_demand), 1) * 1.15;
  const width = 460;
  const padL = 48;
  const padR = 14;
  const padT = 22;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slotW = plotW / data.length;
  const barW = Math.min(46, slotW * 0.56);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full select-none">
      {[0, 0.5, 1].map((t, i) => {
        const v = t * maxVal;
        const y = padT + plotH - t * plotH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[10px]">
              {formatAxisShort(v)}
            </text>
          </g>
        );
      })}
      {data.map((d, idx) => {
        const x = padL + idx * slotW + (slotW - barW) / 2;
        const h = (d.net_demand / maxVal) * plotH;
        const y = padT + plotH - h;
        const isDown = (d.yoy_growth_pct ?? 0) < 0;
        const fill = isDown ? "#fb7185" : "#38bdf8";
        return (
          <g key={d.order_year}>
            <rect x={x} y={y} width={barW} height={h} rx={4} fill={fill} fillOpacity={0.85} />
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              className="fill-slate-200 text-[9.5px] font-medium tabular-nums"
            >
              {d.yoy_growth_pct !== null
                ? `${d.yoy_growth_pct > 0 ? "+" : ""}${d.yoy_growth_pct.toFixed(1)}%`
                : "Basis"}
            </text>
            <text
              x={x + barW / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-400 text-[10.5px] tabular-nums"
            >
              {d.order_year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CategoryParetoChart({
  data,
  height = 225,
}: {
  data: DashboardPayload["categories"];
  height?: number;
}) {
  if (!data.length) return null;
  const maxNet = Math.max(...data.map((d) => d.net_demand), 1);

  return (
    <div className="space-y-2" style={{ minHeight: height }}>
      {data.slice(0, 7).map((cat) => {
        const wPct = Math.max((cat.net_demand / maxNet) * 100, 1.5);
        return (
          <div key={cat.product_category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{cat.product_category}</span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  ({cat.distinct_skus} SKU)
                </span>
              </div>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="text-slate-200">{formatIdUnits(cat.net_demand)}</span>
                <span className="w-14 text-right text-sky-300">{cat.share_pct.toFixed(2)}%</span>
                <span className="w-16 text-right text-[11px] text-amber-300">
                  Kum {cat.cum_share_pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300"
                style={{ width: `${wPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SeasonalityHeatmap({
  data,
}: {
  data: DashboardPayload["seasonality"];
}) {
  const warehouses = ["Whse_J", "Whse_S", "Whse_C", "Whse_A"];
  const lookup = new Map<string, number>();
  data.forEach((d) => lookup.set(`${d.warehouse}-${d.order_month}`, d.seasonal_index));

  const cellStyle = (idx: number) => {
    if (idx >= 1.12) return "bg-emerald-500/35 text-emerald-200 border-emerald-500/40";
    if (idx >= 1.03) return "bg-sky-500/25 text-sky-200 border-sky-500/30";
    if (idx <= 0.88) return "bg-rose-500/30 text-rose-200 border-rose-500/40";
    if (idx <= 0.95) return "bg-amber-500/20 text-amber-200 border-amber-500/30";
    return "bg-slate-800/70 text-slate-300 border-slate-700/60";
  };

  return (
    <div className="w-full">
      <table className="w-full table-fixed border-collapse text-center text-[10.5px] tabular-nums">
        <thead>
          <tr className="text-slate-400">
            <th className="w-14 py-1.5 pr-1 text-left font-medium">Gudang</th>
            {MONTH_LABELS.map((m) => (
              <th key={m} className="px-0.5 py-1.5 font-medium">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {warehouses.map((wh) => (
            <tr key={wh}>
              <td className="py-1 pr-1 text-left font-semibold text-slate-200">{wh}</td>
              {MONTH_LABELS.map((_, idx) => {
                const val = lookup.get(`${wh}-${idx + 1}`) ?? 1;
                return (
                  <td key={idx} className="p-0.5">
                    <div
                      className={`rounded border px-0.5 py-1 font-mono text-[9.5px] ${cellStyle(val)}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
