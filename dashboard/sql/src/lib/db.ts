import path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";

export interface DashboardFilter {
  warehouse: string;
  year: string;
}

export interface DashboardPayload {
  filters: DashboardFilter;
  kpi: {
    netDemand: number;
    grossDemand: number;
    returnUnits: number;
    returnRatePct: number;
    orderLines: number;
    activeSkus: number;
    activeCategories: number;
    classASkus: number;
    classADemandPct: number;
    bestModelName: string;
    bestModelWapePct: number;
    bestModelBiasPct: number;
    forecast2017Total: number;
    forecast2017Lower: number;
    forecast2017Upper: number;
    yoyChangePct: number | null;
  };
  yearlyTrend: Array<{
    order_year: number;
    net_demand: number;
    gross_demand: number;
    return_units: number;
    order_lines: number;
    yoy_growth_pct: number | null;
  }>;
  monthlySeries: Array<{
    ym: string;
    year: number;
    month: number;
    actual_net: number | null;
    backtest_hybrid: number | null;
    backtest_ma6: number | null;
    forecast_2017: number | null;
    forecast_lower: number | null;
    forecast_upper: number | null;
  }>;
  warehouses: Array<{
    warehouse: string;
    total_records: number;
    missing_date_records: number;
    distinct_skus: number;
    total_net_demand: number;
    total_return_units: number;
    return_rate_pct: number;
    share_pct: number;
    net_demand_2016: number;
    forecast_demand_2017: number;
    hybrid_wape_pct: number;
  }>;
  categories: Array<{
    product_category: string;
    distinct_skus: number;
    order_lines: number;
    net_demand: number;
    share_pct: number;
    cum_share_pct: number;
  }>;
  abcSummary: Array<{
    abc_class: string;
    sku_count: number;
    sku_share_pct: number;
    net_demand: number;
    demand_share_pct: number;
  }>;
  patterns: Array<{
    demand_pattern: string;
    sku_count: number;
    sku_share_pct: number;
    net_demand: number;
    demand_share_pct: number;
    avg_cv: number;
    avg_adi: number;
  }>;
  abcXyzMatrix: Array<{
    abc_class: string;
    xyz_class: string;
    sku_count: number;
    net_demand: number;
    demand_share_pct: number;
  }>;
  seasonality: Array<{
    warehouse: string;
    order_month: number;
    avg_month_demand: number;
    seasonal_index: number;
  }>;
  benchmark: Array<{
    model_name: string;
    total_actual_2016: number;
    total_forecast_2016: number;
    wape_pct: number;
    mae: number;
    rmse: number;
    bias_pct: number;
  }>;
  topSkus: Array<{
    product_code: string;
    product_category: string;
    primary_warehouse: string;
    abc_class: string;
    xyz_class: string;
    demand_pattern: string;
    positive_months: number;
    total_net_demand: number;
    demand_share_pct: number;
    cv_60m: number;
  }>;
  dataQuality: Array<{
    warehouse: string;
    total_rows: number;
    missing_date_rows: number;
    parenthesized_rows: number;
    zero_demand_rows: number;
    repeated_5col_rows: number;
    partial_2011_rows: number;
    partial_2017_rows: number;
  }>;
}

const VALID_WAREHOUSES = new Set(["ALL", "Whse_J", "Whse_S", "Whse_C", "Whse_A"]);
const VALID_YEARS = new Set(["ALL", "2012", "2013", "2014", "2015", "2016"]);

function resolveDbPath(): string {
  return path.resolve(process.cwd(), "..", "..", "dataset", "demand_analytics.duckdb");
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function queryRows(
  conn: Awaited<ReturnType<DuckDBInstance["connect"]>>,
  sql: string,
  params: Record<string, string | number> = {}
): Promise<Array<Record<string, unknown>>> {
  const reader =
    Object.keys(params).length > 0
      ? await conn.runAndReadAll(sql, params)
      : await conn.runAndReadAll(sql);
  return reader.getRowObjectsJson() as Array<Record<string, unknown>>;
}

export async function getDashboardData(
  rawWarehouse?: string | null,
  rawYear?: string | null
): Promise<DashboardPayload> {
  const warehouse = rawWarehouse && VALID_WAREHOUSES.has(rawWarehouse) ? rawWarehouse : "ALL";
  const year = rawYear && VALID_YEARS.has(rawYear) ? rawYear : "ALL";
  const yearInt = year === "ALL" ? 0 : Number(year);

  const dbPath = resolveDbPath();
  const instance = await DuckDBInstance.create(dbPath, { access_mode: "READ_ONLY" });
  const conn = await instance.connect();

  try {
    // 1. KPI summary (filtered by warehouse & year on full 2012-2016 analytical scope)
    const kpiRows = await queryRows(
      conn,
      `
      WITH scoped AS (
        SELECT
          order_year,
          product_code,
          product_category,
          warehouse,
          order_demand_gross,
          order_demand_net
        FROM analytics.clean_product_demand
        WHERE NOT is_missing_date
          AND order_year BETWEEN 2012 AND 2016
          AND ($warehouse = 'ALL' OR warehouse = $warehouse)
          AND ($year_int = 0 OR order_year = $year_int)
      ),
      prev_yr AS (
        SELECT SUM(order_demand_net) AS prev_net
        FROM analytics.clean_product_demand
        WHERE NOT is_missing_date
          AND ($warehouse = 'ALL' OR warehouse = $warehouse)
          AND (
            ($year_int = 0 AND order_year = 2015)
            OR ($year_int > 2012 AND order_year = $year_int - 1)
          )
      ),
      curr_yr AS (
        SELECT SUM(order_demand_net) AS curr_net
        FROM analytics.clean_product_demand
        WHERE NOT is_missing_date
          AND ($warehouse = 'ALL' OR warehouse = $warehouse)
          AND (
            ($year_int = 0 AND order_year = 2016)
            OR ($year_int > 2012 AND order_year = $year_int)
          )
      ),
      fcst AS (
        SELECT
          SUM(forecast_demand) AS f_total,
          SUM(forecast_lower) AS f_lower,
          SUM(forecast_upper) AS f_upper
        FROM analytics.forecast_projection_2017
        WHERE ($warehouse = 'ALL' OR warehouse = $warehouse)
      )
      SELECT
        COALESCE(SUM(s.order_demand_net), 0) AS net_demand,
        COALESCE(SUM(s.order_demand_gross), 0) AS gross_demand,
        COALESCE(SUM(CASE WHEN s.order_demand_net < 0 THEN ABS(s.order_demand_net) ELSE 0 END), 0) AS return_units,
        ROUND(100.0 * COALESCE(SUM(CASE WHEN s.order_demand_net < 0 THEN ABS(s.order_demand_net) ELSE 0 END), 0)
          / NULLIF(SUM(s.order_demand_gross), 0), 2) AS return_rate_pct,
        COUNT(*) AS order_lines,
        COUNT(DISTINCT s.product_code) AS active_skus,
        COUNT(DISTINCT s.product_category) AS active_categories,
        MAX(f.f_total) AS f_total,
        MAX(f.f_lower) AS f_lower,
        MAX(f.f_upper) AS f_upper,
        CASE
          WHEN MAX(p.prev_net) > 0 AND ($year_int = 0 OR $year_int > 2012)
          THEN ROUND(100.0 * (MAX(c.curr_net) - MAX(p.prev_net)) / MAX(p.prev_net), 2)
          ELSE NULL
        END AS yoy_change_pct
      FROM scoped s
      CROSS JOIN prev_yr p
      CROSS JOIN curr_yr c
      CROSS JOIN fcst f
      `,
      { warehouse, year_int: yearInt }
    );

    const kpiStatic = await queryRows(
      conn,
      `SELECT class_a_skus, class_a_demand_pct, best_forecast_model, best_model_wape_pct, best_model_bias_pct FROM analytics.vw_kpi_summary`
    );

    // 2. Yearly trend
    const yearlyRows = await queryRows(
      conn,
      `
      WITH yr AS (
        SELECT
          order_year,
          SUM(net_demand) AS net_demand,
          SUM(gross_demand) AS gross_demand,
          SUM(return_units) AS return_units,
          SUM(order_lines) AS order_lines
        FROM analytics.agg_monthly_demand
        WHERE ($warehouse = 'ALL' OR warehouse = $warehouse)
        GROUP BY order_year
      )
      SELECT
        order_year,
        net_demand,
        gross_demand,
        return_units,
        order_lines,
        ROUND(100.0 * (net_demand - LAG(net_demand) OVER (ORDER BY order_year))
          / NULLIF(LAG(net_demand) OVER (ORDER BY order_year), 0), 2) AS yoy_growth_pct
      FROM yr
      ORDER BY order_year
      `,
      { warehouse }
    );

    // 3. Monthly series (2012-01..2016-12 actual + 2016 backtest + 2017 forecast)
    const monthlyRows = await queryRows(
      conn,
      `
      WITH actual_m AS (
        SELECT
          order_ym AS ym,
          order_year AS year,
          order_month AS month,
          SUM(net_demand) AS actual_net
        FROM analytics.agg_monthly_demand
        WHERE ($warehouse = 'ALL' OR warehouse = $warehouse)
          AND ($year_int = 0 OR order_year = $year_int)
        GROUP BY 1, 2, 3
      ),
      bt_m AS (
        SELECT
          order_ym AS ym,
          SUM(f_seasonal_ma6_hybrid) AS backtest_hybrid,
          SUM(f_ma_6m) AS backtest_ma6
        FROM analytics.forecast_backtest_warehouse_2016
        WHERE ($warehouse = 'ALL' OR warehouse = $warehouse)
        GROUP BY 1
      ),
      fc_m AS (
        SELECT
          forecast_ym AS ym,
          forecast_year AS year,
          forecast_month AS month,
          SUM(forecast_demand) AS forecast_2017,
          SUM(forecast_lower) AS forecast_lower,
          SUM(forecast_upper) AS forecast_upper
        FROM analytics.forecast_projection_2017
        WHERE ($warehouse = 'ALL' OR warehouse = $warehouse)
        GROUP BY 1, 2, 3
      )
      SELECT
        COALESCE(a.ym, f.ym) AS ym,
        COALESCE(a.year, f.year) AS year,
        COALESCE(a.month, f.month) AS month,
        a.actual_net,
        b.backtest_hybrid,
        b.backtest_ma6,
        f.forecast_2017,
        f.forecast_lower,
        f.forecast_upper
      FROM actual_m a
      FULL OUTER JOIN fc_m f ON a.ym = f.ym
      LEFT JOIN bt_m b ON a.ym = b.ym
      WHERE ($year_int = 0 OR COALESCE(a.year, f.year) = $year_int OR COALESCE(a.year, f.year) = 2017)
      ORDER BY ym
      `,
      { warehouse, year_int: yearInt }
    );

    // 4. Warehouses performance + backtest WAPE
    const whRows = await queryRows(
      conn,
      `
      WITH bt AS (
        SELECT
          warehouse,
          ROUND(100.0 * SUM(ABS(actual_demand - f_seasonal_ma6_hybrid)) / NULLIF(SUM(actual_demand), 0), 2) AS hybrid_wape_pct
        FROM analytics.forecast_backtest_warehouse_2016
        GROUP BY warehouse
      )
      SELECT
        w.warehouse,
        w.total_records,
        w.missing_date_records,
        w.distinct_skus,
        w.total_net_demand,
        w.total_return_units,
        w.return_rate_pct,
        w.share_of_net_demand_pct AS share_pct,
        w.net_demand_2016,
        w.forecast_demand_2017,
        COALESCE(bt.hybrid_wape_pct, 0) AS hybrid_wape_pct
      FROM analytics.vw_warehouse_performance w
      LEFT JOIN bt ON w.warehouse = bt.warehouse
      ORDER BY w.total_net_demand DESC
      `
    );

    // 5. Top 10 Categories Pareto (scoped by warehouse & year)
    const catRows = await queryRows(
      conn,
      `
      WITH cat_agg AS (
        SELECT
          product_category,
          SUM(order_lines) AS order_lines,
          SUM(net_demand) AS net_demand
        FROM analytics.agg_monthly_demand
        WHERE ($warehouse = 'ALL' OR warehouse = $warehouse)
          AND ($year_int = 0 OR order_year = $year_int)
        GROUP BY product_category
      ),
      sku_cnt AS (
        SELECT
          product_category,
          COUNT(DISTINCT product_code) AS distinct_skus
        FROM analytics.clean_product_demand
        WHERE NOT is_missing_date
          AND order_year BETWEEN 2012 AND 2016
          AND ($warehouse = 'ALL' OR warehouse = $warehouse)
          AND ($year_int = 0 OR order_year = $year_int)
        GROUP BY product_category
      ),
      pareto AS (
        SELECT
          c.product_category,
          COALESCE(s.distinct_skus, 0) AS distinct_skus,
          c.order_lines,
          c.net_demand,
          ROUND(100.0 * c.net_demand / NULLIF(SUM(c.net_demand) OVER (), 0), 2) AS share_pct,
          ROUND(100.0 * SUM(c.net_demand) OVER (ORDER BY c.net_demand DESC, c.product_category)
            / NULLIF(SUM(c.net_demand) OVER (), 0), 2) AS cum_share_pct
        FROM cat_agg c
        LEFT JOIN sku_cnt s ON c.product_category = s.product_category
      )
      SELECT * FROM pareto
      ORDER BY net_demand DESC
      LIMIT 10
      `,
      { warehouse, year_int: yearInt }
    );

    // 6. ABC summary, Pattern summary, ABC-XYZ matrix
    const abcRows = await queryRows(
      conn,
      `
      SELECT
        abc_class,
        COUNT(*) AS sku_count,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS sku_share_pct,
        SUM(total_net_demand) AS net_demand,
        ROUND(100.0 * SUM(total_net_demand) / SUM(SUM(total_net_demand)) OVER (), 2) AS demand_share_pct
      FROM analytics.agg_sku_forecast_profile
      GROUP BY abc_class
      ORDER BY abc_class
      `
    );

    const patternRows = await queryRows(
      conn,
      `
      SELECT
        demand_pattern,
        COUNT(*) AS sku_count,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS sku_share_pct,
        SUM(total_net_demand) AS net_demand,
        ROUND(100.0 * SUM(total_net_demand) / SUM(SUM(total_net_demand)) OVER (), 2) AS demand_share_pct,
        ROUND(AVG(cv_60m), 2) AS avg_cv,
        ROUND(AVG(adi), 2) AS avg_adi
      FROM analytics.agg_sku_forecast_profile
      GROUP BY demand_pattern
      ORDER BY net_demand DESC
      `
    );

    const matrixRows = await queryRows(
      conn,
      `
      SELECT
        abc_class,
        xyz_class,
        COUNT(*) AS sku_count,
        SUM(total_net_demand) AS net_demand,
        ROUND(100.0 * SUM(total_net_demand) / SUM(SUM(total_net_demand)) OVER (), 2) AS demand_share_pct
      FROM analytics.agg_sku_forecast_profile
      GROUP BY abc_class, xyz_class
      ORDER BY abc_class, xyz_class
      `
    );

    // 7. Seasonality heatmap
    const seasonRows = await queryRows(
      conn,
      `SELECT warehouse, order_month, avg_month_demand, seasonal_index FROM analytics.vw_seasonality_heatmap ORDER BY warehouse, order_month`
    );

    // 8. Benchmark 2016 (recomputed dynamically when warehouse filter is active!)
    const benchRows = await queryRows(
      conn,
      `
      WITH scoped_bt AS (
        SELECT *
        FROM analytics.forecast_backtest_warehouse_2016
        WHERE ($warehouse = 'ALL' OR warehouse = $warehouse)
      ),
      unpivoted AS (
        SELECT warehouse, order_ym, actual_demand, 'Moving Average 6M' AS model_name, f_ma_6m AS forecast_val FROM scoped_bt
        UNION ALL
        SELECT warehouse, order_ym, actual_demand, 'Seasonal-MA6 Hybrid' AS model_name, f_seasonal_ma6_hybrid AS forecast_val FROM scoped_bt
        UNION ALL
        SELECT warehouse, order_ym, actual_demand, 'Moving Average 3M' AS model_name, f_ma_3m AS forecast_val FROM scoped_bt
        UNION ALL
        SELECT warehouse, order_ym, actual_demand, 'Naive (t-1)' AS model_name, f_naive_1m AS forecast_val FROM scoped_bt
        UNION ALL
        SELECT warehouse, order_ym, actual_demand, 'Seasonal Naive (t-12)' AS model_name, f_seasonal_naive_12m AS forecast_val FROM scoped_bt
      )
      SELECT
        model_name,
        SUM(actual_demand) AS total_actual_2016,
        SUM(forecast_val) AS total_forecast_2016,
        ROUND(100.0 * SUM(ABS(actual_demand - forecast_val)) / NULLIF(SUM(ABS(actual_demand)), 0), 2) AS wape_pct,
        ROUND(AVG(ABS(actual_demand - forecast_val)), 0) AS mae,
        ROUND(SQRT(AVG(POWER(actual_demand - forecast_val, 2))), 0) AS rmse,
        ROUND(100.0 * SUM(forecast_val - actual_demand) / NULLIF(SUM(actual_demand), 0), 2) AS bias_pct
      FROM unpivoted
      GROUP BY model_name
      ORDER BY wape_pct ASC
      `,
      { warehouse }
    );

    // 9. Top 12 SKUs
    const skuRows = await queryRows(
      conn,
      `
      SELECT
        product_code,
        product_category,
        primary_warehouse,
        abc_class,
        xyz_class,
        demand_pattern,
        positive_months,
        total_net_demand,
        demand_share_pct,
        cv_60m
      FROM analytics.vw_sku_forecast_leaderboard
      WHERE ($warehouse = 'ALL' OR primary_warehouse = $warehouse)
      ORDER BY total_net_demand DESC
      LIMIT 12
      `,
      { warehouse }
    );

    // 10. Data quality summary
    const dqRows = await queryRows(
      conn,
      `SELECT * FROM analytics.vw_data_quality_summary ORDER BY total_rows DESC`
    );

    const k0 = kpiRows[0] ?? {};
    const ks = kpiStatic[0] ?? {};
    const bestScoped = benchRows[0] ?? {};

    return {
      filters: { warehouse, year },
      kpi: {
        netDemand: toNum(k0.net_demand),
        grossDemand: toNum(k0.gross_demand),
        returnUnits: toNum(k0.return_units),
        returnRatePct: toNum(k0.return_rate_pct),
        orderLines: toNum(k0.order_lines),
        activeSkus: toNum(k0.active_skus),
        activeCategories: toNum(k0.active_categories),
        classASkus: toNum(ks.class_a_skus),
        classADemandPct: toNum(ks.class_a_demand_pct),
        bestModelName: String(bestScoped.model_name ?? ks.best_forecast_model ?? "Moving Average 6M"),
        bestModelWapePct: toNum(bestScoped.wape_pct ?? ks.best_model_wape_pct),
        bestModelBiasPct: toNum(bestScoped.bias_pct ?? ks.best_model_bias_pct),
        forecast2017Total: toNum(k0.f_total),
        forecast2017Lower: toNum(k0.f_lower),
        forecast2017Upper: toNum(k0.f_upper),
        yoyChangePct: toNumOrNull(k0.yoy_change_pct),
      },
      yearlyTrend: yearlyRows.map((r) => ({
        order_year: toNum(r.order_year),
        net_demand: toNum(r.net_demand),
        gross_demand: toNum(r.gross_demand),
        return_units: toNum(r.return_units),
        order_lines: toNum(r.order_lines),
        yoy_growth_pct: toNumOrNull(r.yoy_growth_pct),
      })),
      monthlySeries: monthlyRows.map((r) => ({
        ym: String(r.ym),
        year: toNum(r.year),
        month: toNum(r.month),
        actual_net: toNumOrNull(r.actual_net),
        backtest_hybrid: toNumOrNull(r.backtest_hybrid),
        backtest_ma6: toNumOrNull(r.backtest_ma6),
        forecast_2017: toNumOrNull(r.forecast_2017),
        forecast_lower: toNumOrNull(r.forecast_lower),
        forecast_upper: toNumOrNull(r.forecast_upper),
      })),
      warehouses: whRows.map((r) => ({
        warehouse: String(r.warehouse),
        total_records: toNum(r.total_records),
        missing_date_records: toNum(r.missing_date_records),
        distinct_skus: toNum(r.distinct_skus),
        total_net_demand: toNum(r.total_net_demand),
        total_return_units: toNum(r.total_return_units),
        return_rate_pct: toNum(r.return_rate_pct),
        share_pct: toNum(r.share_pct),
        net_demand_2016: toNum(r.net_demand_2016),
        forecast_demand_2017: toNum(r.forecast_demand_2017),
        hybrid_wape_pct: toNum(r.hybrid_wape_pct),
      })),
      categories: catRows.map((r) => ({
        product_category: String(r.product_category),
        distinct_skus: toNum(r.distinct_skus),
        order_lines: toNum(r.order_lines),
        net_demand: toNum(r.net_demand),
        share_pct: toNum(r.share_pct),
        cum_share_pct: toNum(r.cum_share_pct),
      })),
      abcSummary: abcRows.map((r) => ({
        abc_class: String(r.abc_class),
        sku_count: toNum(r.sku_count),
        sku_share_pct: toNum(r.sku_share_pct),
        net_demand: toNum(r.net_demand),
        demand_share_pct: toNum(r.demand_share_pct),
      })),
      patterns: patternRows.map((r) => ({
        demand_pattern: String(r.demand_pattern),
        sku_count: toNum(r.sku_count),
        sku_share_pct: toNum(r.sku_share_pct),
        net_demand: toNum(r.net_demand),
        demand_share_pct: toNum(r.demand_share_pct),
        avg_cv: toNum(r.avg_cv),
        avg_adi: toNum(r.avg_adi),
      })),
      abcXyzMatrix: matrixRows.map((r) => ({
        abc_class: String(r.abc_class),
        xyz_class: String(r.xyz_class),
        sku_count: toNum(r.sku_count),
        net_demand: toNum(r.net_demand),
        demand_share_pct: toNum(r.demand_share_pct),
      })),
      seasonality: seasonRows.map((r) => ({
        warehouse: String(r.warehouse),
        order_month: toNum(r.order_month),
        avg_month_demand: toNum(r.avg_month_demand),
        seasonal_index: toNum(r.seasonal_index),
      })),
      benchmark: benchRows.map((r) => ({
        model_name: String(r.model_name),
        total_actual_2016: toNum(r.total_actual_2016),
        total_forecast_2016: toNum(r.total_forecast_2016),
        wape_pct: toNum(r.wape_pct),
        mae: toNum(r.mae),
        rmse: toNum(r.rmse),
        bias_pct: toNum(r.bias_pct),
      })),
      topSkus: skuRows.map((r) => ({
        product_code: String(r.product_code),
        product_category: String(r.product_category),
        primary_warehouse: String(r.primary_warehouse),
        abc_class: String(r.abc_class),
        xyz_class: String(r.xyz_class),
        demand_pattern: String(r.demand_pattern),
        positive_months: toNum(r.positive_months),
        total_net_demand: toNum(r.total_net_demand),
        demand_share_pct: toNum(r.demand_share_pct),
        cv_60m: toNum(r.cv_60m),
      })),
      dataQuality: dqRows.map((r) => ({
        warehouse: String(r.warehouse),
        total_rows: toNum(r.total_rows),
        missing_date_rows: toNum(r.missing_date_rows),
        parenthesized_rows: toNum(r.parenthesized_rows),
        zero_demand_rows: toNum(r.zero_demand_rows),
        repeated_5col_rows: toNum(r.repeated_5col_rows),
        partial_2011_rows: toNum(r.partial_2011_rows),
        partial_2017_rows: toNum(r.partial_2017_rows),
      })),
    };
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
}
