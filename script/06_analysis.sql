-- ============================================================================
-- 06_analysis.sql
-- Analisis Inti: ABC-XYZ, Syntetos-Boylan Predictability, Backtest & Forecast
-- ============================================================================

-- 1. Klasifikasi ABC-XYZ & Syntetos-Boylan pada tingkat SKU (2012-2016 = 60 bulan)
DROP TABLE IF EXISTS analytics.agg_sku_forecast_profile;
CREATE TABLE analytics.agg_sku_forecast_profile AS
WITH months_grid AS (
    SELECT DISTINCT order_ym, order_year, order_month
    FROM analytics.agg_monthly_demand
),
sku_list AS (
    SELECT DISTINCT product_code, product_category
    FROM analytics.agg_sku_monthly
),
sku_60m AS (
    SELECT
        s.product_code,
        s.product_category,
        m.order_ym,
        COALESCE(a.net_demand, 0) AS net_demand,
        COALESCE(a.order_lines, 0) AS order_lines
    FROM sku_list s
    CROSS JOIN months_grid m
    LEFT JOIN analytics.agg_sku_monthly a
        ON s.product_code = a.product_code AND m.order_ym = a.order_ym
),
sku_stats AS (
    SELECT
        product_code,
        MAX(product_category) AS product_category,
        SUM(net_demand) AS total_net_demand,
        SUM(order_lines) AS total_order_lines,
        AVG(net_demand) AS mean_monthly_60m,
        STDDEV_SAMP(net_demand) AS sd_monthly_60m,
        SUM(CASE WHEN net_demand > 0 THEN 1 ELSE 0 END) AS positive_months,
        AVG(CASE WHEN net_demand > 0 THEN net_demand END) AS mean_nonzero_monthly,
        STDDEV_SAMP(CASE WHEN net_demand > 0 THEN net_demand END) AS sd_nonzero_monthly
    FROM sku_60m
    GROUP BY product_code
),
ranked AS (
    SELECT
        *,
        SUM(GREATEST(total_net_demand, 0)) OVER () AS grand_positive_sku_demand,
        SUM(GREATEST(total_net_demand, 0)) OVER (
            ORDER BY total_net_demand DESC, product_code
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cum_demand,
        CASE
            WHEN mean_monthly_60m > 0 THEN sd_monthly_60m / mean_monthly_60m
            ELSE NULL
        END AS cv_60m,
        CASE
            WHEN positive_months > 0 THEN 60.0 / positive_months
            ELSE 60.0
        END AS adi,
        CASE
            WHEN mean_nonzero_monthly > 0 AND sd_nonzero_monthly IS NOT NULL
                THEN POWER(sd_nonzero_monthly / mean_nonzero_monthly, 2)
            ELSE 0.0
        END AS cv_squared
    FROM sku_stats
)
SELECT
    product_code,
    product_category,
    total_net_demand,
    total_order_lines,
    positive_months,
    ROUND(100.0 * GREATEST(total_net_demand, 0) / NULLIF(grand_positive_sku_demand, 0), 4) AS demand_share_pct,
    ROUND(100.0 * cum_demand / NULLIF(grand_positive_sku_demand, 0), 4) AS cum_demand_pct,
    CASE
        WHEN 100.0 * cum_demand / NULLIF(grand_positive_sku_demand, 0) <= 80.0 THEN 'A'
        WHEN 100.0 * cum_demand / NULLIF(grand_positive_sku_demand, 0) <= 95.0 THEN 'B'
        ELSE 'C'
    END AS abc_class,
    ROUND(cv_60m, 4) AS cv_60m,
    CASE
        WHEN cv_60m IS NULL THEN 'Z'
        WHEN cv_60m <= 0.50 THEN 'X'
        WHEN cv_60m <= 1.00 THEN 'Y'
        ELSE 'Z'
    END AS xyz_class,
    ROUND(adi, 4) AS adi,
    ROUND(cv_squared, 4) AS cv_squared,
    CASE
        WHEN adi < 1.32 AND cv_squared < 0.49 THEN 'Smooth'
        WHEN adi < 1.32 AND cv_squared >= 0.49 THEN 'Erratic'
        WHEN adi >= 1.32 AND cv_squared < 0.49 THEN 'Intermittent'
        ELSE 'Lumpy'
    END AS demand_pattern
FROM ranked;

-- 2. Backtesting Model Forecasting Bulanan per Gudang (Holdout 12 bulan: 2016 vs Training 2012-2015)
DROP TABLE IF EXISTS analytics.forecast_backtest_warehouse_2016;
CREATE TABLE analytics.forecast_backtest_warehouse_2016 AS
WITH wh_monthly AS (
    SELECT
        warehouse,
        order_ym,
        order_year,
        order_month,
        month_start_date,
        SUM(net_demand) AS actual_demand
    FROM analytics.agg_monthly_demand
    GROUP BY 1, 2, 3, 4, 5
),
seasonal_train AS (
    -- Indeks musiman dihitung murni dari data training 2012-2015 (anti data leakage)
    SELECT
        warehouse,
        order_month,
        AVG(actual_demand) AS train_month_avg,
        AVG(AVG(actual_demand)) OVER (PARTITION BY warehouse) AS train_overall_avg,
        AVG(actual_demand) / NULLIF(AVG(AVG(actual_demand)) OVER (PARTITION BY warehouse), 0) AS seasonal_idx_train
    FROM wh_monthly
    WHERE order_year BETWEEN 2012 AND 2015
    GROUP BY warehouse, order_month
),
with_lags AS (
    SELECT
        w.warehouse,
        w.order_ym,
        w.order_year,
        w.order_month,
        w.month_start_date,
        w.actual_demand,
        LAG(w.actual_demand, 1) OVER (PARTITION BY w.warehouse ORDER BY w.month_start_date) AS f_naive_1m,
        LAG(w.actual_demand, 12) OVER (PARTITION BY w.warehouse ORDER BY w.month_start_date) AS f_seasonal_naive_12m,
        AVG(w.actual_demand) OVER (
            PARTITION BY w.warehouse ORDER BY w.month_start_date
            ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING
        ) AS f_ma_3m,
        AVG(w.actual_demand) OVER (
            PARTITION BY w.warehouse ORDER BY w.month_start_date
            ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING
        ) AS f_ma_6m,
        s.seasonal_idx_train
    FROM wh_monthly w
    LEFT JOIN seasonal_train s
        ON w.warehouse = s.warehouse AND w.order_month = s.order_month
),
hybrid_calc AS (
    SELECT
        warehouse,
        order_ym,
        order_year,
        order_month,
        month_start_date,
        actual_demand,
        ROUND(f_naive_1m, 0) AS f_naive_1m,
        ROUND(f_seasonal_naive_12m, 0) AS f_seasonal_naive_12m,
        ROUND(f_ma_3m, 0) AS f_ma_3m,
        ROUND(f_ma_6m, 0) AS f_ma_6m,
        -- Seasonal-Trend Hybrid: rata-rata deseasonalized 6M terakhir * indeks musiman training
        ROUND(f_ma_6m * seasonal_idx_train, 0) AS f_seasonal_ma6_hybrid
    FROM with_lags
)
SELECT *
FROM hybrid_calc
WHERE order_year = 2016;

-- 3. Ringkasan Akurasi Model Backtesting 2016 (WAPE, MAE, RMSE, Bias %)
DROP TABLE IF EXISTS analytics.forecast_model_benchmark_2016;
CREATE TABLE analytics.forecast_model_benchmark_2016 AS
WITH unpivoted AS (
    SELECT warehouse, order_ym, actual_demand, 'Naive (t-1)' AS model_name, f_naive_1m AS forecast_val FROM analytics.forecast_backtest_warehouse_2016
    UNION ALL
    SELECT warehouse, order_ym, actual_demand, 'Seasonal Naive (t-12)' AS model_name, f_seasonal_naive_12m AS forecast_val FROM analytics.forecast_backtest_warehouse_2016
    UNION ALL
    SELECT warehouse, order_ym, actual_demand, 'Moving Average 3M' AS model_name, f_ma_3m AS forecast_val FROM analytics.forecast_backtest_warehouse_2016
    UNION ALL
    SELECT warehouse, order_ym, actual_demand, 'Moving Average 6M' AS model_name, f_ma_6m AS forecast_val FROM analytics.forecast_backtest_warehouse_2016
    UNION ALL
    SELECT warehouse, order_ym, actual_demand, 'Seasonal-MA6 Hybrid' AS model_name, f_seasonal_ma6_hybrid AS forecast_val FROM analytics.forecast_backtest_warehouse_2016
)
SELECT
    model_name,
    COUNT(*) AS eval_points,
    SUM(actual_demand) AS total_actual_2016,
    SUM(forecast_val) AS total_forecast_2016,
    ROUND(100.0 * SUM(ABS(actual_demand - forecast_val)) / NULLIF(SUM(ABS(actual_demand)), 0), 2) AS wape_pct,
    ROUND(AVG(ABS(actual_demand - forecast_val)), 0) AS mae,
    ROUND(SQRT(AVG(POWER(actual_demand - forecast_val, 2))), 0) AS rmse,
    ROUND(100.0 * SUM(forecast_val - actual_demand) / NULLIF(SUM(actual_demand), 0), 2) AS bias_pct
FROM unpivoted
GROUP BY model_name
ORDER BY wape_pct ASC;

-- 4. Proyeksi Forecast Baseline 2017 (12 Bulan) per Gudang menggunakan indeks musiman 2012-2016 + level 6M terakhir 2016
DROP TABLE IF EXISTS analytics.forecast_projection_2017;
CREATE TABLE analytics.forecast_projection_2017 AS
WITH wh_monthly AS (
    SELECT
        warehouse,
        order_year,
        order_month,
        SUM(net_demand) AS actual_demand
    FROM analytics.agg_monthly_demand
    GROUP BY 1, 2, 3
),
seasonal_full AS (
    SELECT
        warehouse,
        order_month,
        AVG(actual_demand) AS month_avg,
        AVG(AVG(actual_demand)) OVER (PARTITION BY warehouse) AS overall_avg,
        AVG(actual_demand) / NULLIF(AVG(AVG(actual_demand)) OVER (PARTITION BY warehouse), 0) AS seasonal_index
    FROM wh_monthly
    GROUP BY warehouse, order_month
),
recent_level AS (
    SELECT
        warehouse,
        AVG(actual_demand) AS ma6_base_2016_h2,
        AVG(CASE WHEN order_month BETWEEN 10 AND 12 THEN actual_demand END) AS ma3_base_2016_q4
    FROM wh_monthly
    WHERE order_year = 2016 AND order_month >= 7
    GROUP BY warehouse
),
backtest_err AS (
    SELECT
        warehouse,
        ROUND(1.0 * SUM(ABS(actual_demand - f_seasonal_ma6_hybrid)) / NULLIF(SUM(actual_demand), 0), 4) AS wh_wape_ratio
    FROM analytics.forecast_backtest_warehouse_2016
    GROUP BY warehouse
)
SELECT
    s.warehouse,
    2017 AS forecast_year,
    s.order_month AS forecast_month,
    PRINTF('2017-%02d', s.order_month) AS forecast_ym,
    ROUND(r.ma6_base_2016_h2, 0) AS baseline_level,
    ROUND(s.seasonal_index, 4) AS seasonal_index,
    ROUND(r.ma6_base_2016_h2 * s.seasonal_index, 0) AS forecast_demand,
    ROUND(r.ma6_base_2016_h2 * s.seasonal_index * (1.0 - COALESCE(b.wh_wape_ratio, 0.15)), 0) AS forecast_lower,
    ROUND(r.ma6_base_2016_h2 * s.seasonal_index * (1.0 + COALESCE(b.wh_wape_ratio, 0.15)), 0) AS forecast_upper
FROM seasonal_full s
JOIN recent_level r ON s.warehouse = r.warehouse
LEFT JOIN backtest_err b ON s.warehouse = b.warehouse
ORDER BY s.warehouse, s.order_month;
