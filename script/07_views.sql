-- ============================================================================
-- 07_views.sql
-- Views analitik terstandarisasi untuk konsumsi dashboard & pelaporan
-- ============================================================================

-- 1. Ringkasan KPI Utama (Periode penuh 2012-2016 & keseluruhan)
CREATE OR REPLACE VIEW analytics.vw_kpi_summary AS
WITH all_scope AS (
    SELECT
        COUNT(*) AS total_raw_rows,
        SUM(CASE WHEN is_missing_date THEN 1 ELSE 0 END) AS missing_date_rows,
        SUM(CASE WHEN is_parenthesized_demand THEN 1 ELSE 0 END) AS parenthesized_rows,
        SUM(CASE WHEN is_exact_duplicate_record THEN 1 ELSE 0 END) AS repeated_5col_rows,
        SUM(order_demand_gross) AS all_gross_demand,
        SUM(order_demand_net) AS all_net_demand
    FROM analytics.clean_product_demand
),
full_scope AS (
    SELECT
        COUNT(*) AS full_period_rows,
        COUNT(DISTINCT product_code) AS active_skus_full_period,
        COUNT(DISTINCT product_category) AS active_categories,
        COUNT(DISTINCT warehouse) AS active_warehouses,
        SUM(order_demand_gross) AS full_gross_demand,
        SUM(order_demand_net) AS full_net_demand,
        SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END) AS full_return_units,
        ROUND(100.0 * SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END)
            / NULLIF(SUM(order_demand_gross), 0), 2) AS return_rate_pct
    FROM analytics.clean_product_demand
    WHERE NOT is_missing_date AND order_year BETWEEN 2012 AND 2016
),
abc_a AS (
    SELECT
        COUNT(*) AS class_a_skus,
        ROUND(100.0 * SUM(total_net_demand) / (SELECT full_net_demand FROM full_scope), 2) AS class_a_demand_pct
    FROM analytics.agg_sku_forecast_profile
    WHERE abc_class = 'A'
),
best_model AS (
    SELECT model_name, wape_pct, bias_pct
    FROM analytics.forecast_model_benchmark_2016
    ORDER BY wape_pct ASC
    LIMIT 1
)
SELECT
    a.*,
    f.*,
    ab.class_a_skus,
    ab.class_a_demand_pct,
    bm.model_name AS best_forecast_model,
    bm.wape_pct AS best_model_wape_pct,
    bm.bias_pct AS best_model_bias_pct
FROM all_scope a
CROSS JOIN full_scope f
CROSS JOIN abc_a ab
CROSS JOIN best_model bm;

-- 2. Tren Bulanan per Gudang (2012-2016)
CREATE OR REPLACE VIEW analytics.vw_monthly_trend AS
SELECT
    order_ym,
    order_year,
    order_month,
    month_start_date,
    warehouse,
    SUM(order_lines) AS order_lines,
    SUM(active_skus) AS category_active_skus_sum,
    SUM(gross_demand) AS gross_demand,
    SUM(net_demand) AS net_demand,
    SUM(return_units) AS return_units
FROM analytics.agg_monthly_demand
GROUP BY 1, 2, 3, 4, 5
ORDER BY month_start_date, warehouse;

-- 3. Kinerja Gudang (lengkap)
CREATE OR REPLACE VIEW analytics.vw_warehouse_performance AS
SELECT
    w.warehouse,
    w.total_records,
    w.dated_records,
    w.missing_date_records,
    w.distinct_skus,
    w.distinct_categories,
    w.total_gross_demand,
    w.total_net_demand,
    w.total_return_units,
    w.return_rate_pct,
    ROUND(100.0 * w.total_net_demand / SUM(w.total_net_demand) OVER (), 2) AS share_of_net_demand_pct,
    COALESCE(f2016.net_2016, 0) AS net_demand_2016,
    COALESCE(f2017.forecast_2017, 0) AS forecast_demand_2017
FROM analytics.dim_warehouse w
LEFT JOIN (
    SELECT warehouse, SUM(net_demand) AS net_2016
    FROM analytics.agg_monthly_demand
    WHERE order_year = 2016
    GROUP BY warehouse
) f2016 ON w.warehouse = f2016.warehouse
LEFT JOIN (
    SELECT warehouse, SUM(forecast_demand) AS forecast_2017
    FROM analytics.forecast_projection_2017
    GROUP BY warehouse
) f2017 ON w.warehouse = f2017.warehouse
ORDER BY w.total_net_demand DESC;

-- 4. Pareto Kategori Produk (2012-2016)
CREATE OR REPLACE VIEW analytics.vw_category_pareto AS
WITH cat AS (
    SELECT
        product_category,
        SUM(order_lines) AS order_lines,
        SUM(gross_demand) AS gross_demand,
        SUM(net_demand) AS net_demand,
        SUM(return_units) AS return_units
    FROM analytics.agg_monthly_demand
    GROUP BY product_category
),
skus AS (
    SELECT product_category, COUNT(DISTINCT product_code) AS distinct_skus
    FROM analytics.dim_product
    GROUP BY product_category
)
SELECT
    c.product_category,
    s.distinct_skus,
    c.order_lines,
    c.gross_demand,
    c.net_demand,
    c.return_units,
    ROUND(100.0 * c.net_demand / SUM(c.net_demand) OVER (), 2) AS share_pct,
    ROUND(100.0 * SUM(c.net_demand) OVER (ORDER BY c.net_demand DESC, c.product_category)
        / SUM(c.net_demand) OVER (), 2) AS cum_share_pct
FROM cat c
JOIN skus s ON c.product_category = s.product_category
ORDER BY c.net_demand DESC;

-- 5. Matriks ABC-XYZ & Pola Permintaan Syntetos-Boylan
CREATE OR REPLACE VIEW analytics.vw_abc_xyz_matrix AS
SELECT
    abc_class,
    xyz_class,
    demand_pattern,
    COUNT(*) AS sku_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS sku_share_pct,
    SUM(total_net_demand) AS total_net_demand,
    ROUND(100.0 * SUM(total_net_demand) / SUM(SUM(total_net_demand)) OVER (), 2) AS demand_share_pct,
    ROUND(AVG(cv_60m), 2) AS avg_cv,
    ROUND(AVG(adi), 2) AS avg_adi
FROM analytics.agg_sku_forecast_profile
GROUP BY abc_class, xyz_class, demand_pattern
ORDER BY abc_class, xyz_class, demand_pattern;

-- 6. Leaderboard Top SKU & Profil Prediktabilitas
CREATE OR REPLACE VIEW analytics.vw_sku_forecast_leaderboard AS
SELECT
    p.product_code,
    p.product_category,
    d.primary_warehouse,
    d.warehouse_count,
    p.abc_class,
    p.xyz_class,
    p.demand_pattern,
    p.positive_months,
    p.total_order_lines,
    p.total_net_demand,
    p.demand_share_pct,
    p.cv_60m,
    p.adi
FROM analytics.agg_sku_forecast_profile p
JOIN analytics.dim_product d ON p.product_code = d.product_code
ORDER BY p.total_net_demand DESC;

-- 7. Heatmap Musiman Gudang x Bulan (2012-2016)
CREATE OR REPLACE VIEW analytics.vw_seasonality_heatmap AS
WITH wh_m AS (
    SELECT
        warehouse,
        order_year,
        order_month,
        SUM(net_demand) AS net_demand
    FROM analytics.agg_monthly_demand
    GROUP BY 1, 2, 3
),
wh_avg AS (
    SELECT
        warehouse,
        order_month,
        AVG(net_demand) AS avg_month_demand
    FROM wh_m
    GROUP BY warehouse, order_month
)
SELECT
    warehouse,
    order_month,
    ROUND(avg_month_demand, 0) AS avg_month_demand,
    ROUND(avg_month_demand / NULLIF(AVG(avg_month_demand) OVER (PARTITION BY warehouse), 0), 4) AS seasonal_index
FROM wh_avg
ORDER BY warehouse, order_month;

-- 8. Ringkasan Kualitas Data
CREATE OR REPLACE VIEW analytics.vw_data_quality_summary AS
SELECT
    warehouse,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN is_missing_date THEN 1 ELSE 0 END) AS missing_date_rows,
    SUM(CASE WHEN is_parenthesized_demand THEN 1 ELSE 0 END) AS parenthesized_rows,
    SUM(CASE WHEN is_zero_demand THEN 1 ELSE 0 END) AS zero_demand_rows,
    SUM(CASE WHEN is_exact_duplicate_record THEN 1 ELSE 0 END) AS repeated_5col_rows,
    SUM(CASE WHEN order_year = 2011 THEN 1 ELSE 0 END) AS partial_2011_rows,
    SUM(CASE WHEN order_year = 2017 THEN 1 ELSE 0 END) AS partial_2017_rows
FROM analytics.clean_product_demand
GROUP BY warehouse
ORDER BY total_rows DESC;
