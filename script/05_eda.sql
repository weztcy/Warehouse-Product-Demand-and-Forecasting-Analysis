-- ============================================================================
-- 05_eda.sql
-- Exploratory Data Analysis (EDA): Univariat, Bivariat, Musiman, & Volatilitas
-- ============================================================================

-- 1. Rekonsiliasi Cakupan Dataset (Penuh 2012-2016 vs Parsial 2011/2017 vs Tanpa Tanggal)
SELECT
    CASE
        WHEN is_missing_date THEN 'Tanpa Tanggal (Whse_A)'
        WHEN order_year = 2011 THEN 'Parsial 2011'
        WHEN order_year = 2017 THEN 'Parsial 2017 (Jan)'
        ELSE 'Penuh 2012-2016'
    END AS data_scope,
    COUNT(*) AS row_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 4) AS row_share_pct,
    SUM(order_demand_gross) AS gross_demand,
    SUM(order_demand_net) AS net_demand,
    ROUND(100.0 * SUM(order_demand_net) / SUM(SUM(order_demand_net)) OVER (), 4) AS net_demand_share_pct
FROM analytics.clean_product_demand
GROUP BY 1
ORDER BY row_count DESC;

-- 2. Kinerja Tahunan (2012-2016) & Pertumbuhan YoY
WITH yearly AS (
    SELECT
        order_year,
        COUNT(*) AS order_lines,
        COUNT(DISTINCT product_code) AS active_skus,
        SUM(order_demand_gross) AS gross_demand,
        SUM(order_demand_net) AS net_demand,
        SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END) AS return_units
    FROM analytics.clean_product_demand
    WHERE NOT is_missing_date
      AND order_year BETWEEN 2012 AND 2016
    GROUP BY order_year
)
SELECT
    order_year,
    order_lines,
    active_skus,
    gross_demand,
    net_demand,
    return_units,
    ROUND(100.0 * (net_demand - LAG(net_demand) OVER (ORDER BY order_year))
        / NULLIF(LAG(net_demand) OVER (ORDER BY order_year), 0), 2) AS yoy_net_growth_pct
FROM yearly
ORDER BY order_year;

-- 3. Pola Musiman Rata-Rata per Bulan (2012-2016) + Indeks Musiman
WITH monthly_totals AS (
    SELECT
        order_year,
        order_month,
        SUM(net_demand) AS month_net_demand,
        SUM(order_lines) AS month_order_lines
    FROM analytics.agg_monthly_demand
    GROUP BY order_year, order_month
),
overall_avg AS (
    SELECT AVG(month_net_demand) AS global_monthly_avg
    FROM monthly_totals
)
SELECT
    m.order_month,
    ROUND(AVG(m.month_net_demand), 0) AS avg_monthly_net_demand,
    ROUND(STDDEV_SAMP(m.month_net_demand), 0) AS sd_monthly_net_demand,
    ROUND(AVG(m.month_order_lines), 0) AS avg_monthly_order_lines,
    ROUND(AVG(m.month_net_demand) / o.global_monthly_avg, 4) AS seasonal_index
FROM monthly_totals m
CROSS JOIN overall_avg o
GROUP BY m.order_month, o.global_monthly_avg
ORDER BY m.order_month;

-- 4. Pola Permintaan Berdasarkan Hari dalam Minggu (1=Senin .. 7=Minggu, 2012-2016)
SELECT
    day_of_week,
    COUNT(*) AS order_lines,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS line_share_pct,
    SUM(order_demand_net) AS total_net_demand,
    ROUND(AVG(order_demand_net), 2) AS avg_demand_per_line
FROM analytics.clean_product_demand
WHERE NOT is_missing_date
  AND order_year BETWEEN 2012 AND 2016
GROUP BY day_of_week
ORDER BY day_of_week;

-- 5. Top 10 Kategori Produk menurut Net Demand (2012-2016)
SELECT
    product_category,
    COUNT(DISTINCT product_code) AS skus,
    SUM(order_lines) AS order_lines,
    SUM(net_demand) AS net_demand,
    ROUND(100.0 * SUM(net_demand) / SUM(SUM(net_demand)) OVER (), 2) AS share_pct
FROM analytics.agg_sku_monthly
GROUP BY product_category
ORDER BY net_demand DESC
LIMIT 10;

-- 6. Kinerja Gudang x Tahun (2012-2016)
SELECT
    warehouse,
    order_year,
    SUM(order_lines) AS order_lines,
    SUM(active_skus) AS sku_month_slots,
    SUM(net_demand) AS net_demand,
    SUM(return_units) AS return_units
FROM analytics.agg_monthly_demand
GROUP BY warehouse, order_year
ORDER BY warehouse, order_year;
