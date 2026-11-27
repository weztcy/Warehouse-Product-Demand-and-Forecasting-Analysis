-- ============================================================================
-- 04_cleaning_transformation.sql
-- Pembersihan data (terpisah dari raw) dan transformasi dimensi/agregat
-- ============================================================================

-- 1. Populasi tabel bersih analytics.clean_product_demand
DELETE FROM analytics.clean_product_demand;

WITH base AS (
    SELECT
        row_id,
        TRIM(product_code) AS product_code,
        TRIM(warehouse) AS warehouse,
        TRIM(product_category) AS product_category,
        order_date_raw,
        TRY_STRPTIME(TRIM(order_date_raw), '%Y/%m/%d')::DATE AS order_date,
        TRIM(order_demand_raw) AS demand_trimmed,
        REGEXP_MATCHES(TRIM(order_demand_raw), '^\(\d+\)$') AS is_parenthesized_demand,
        CASE
            WHEN REGEXP_MATCHES(TRIM(order_demand_raw), '^\(\d+\)$')
                THEN -CAST(REGEXP_REPLACE(TRIM(order_demand_raw), '[()]', '', 'g') AS BIGINT)
            ELSE CAST(TRIM(order_demand_raw) AS BIGINT)
        END AS order_demand_net
    FROM raw.product_demand_raw
),
flagged AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY product_code, warehouse, product_category, order_date, demand_trimmed
            ORDER BY row_id
        ) AS dup_seq
    FROM base
)
INSERT INTO analytics.clean_product_demand (
    row_id,
    product_code,
    warehouse,
    product_category,
    order_date,
    order_year,
    order_month,
    order_quarter,
    order_ym,
    day_of_week,
    is_missing_date,
    is_parenthesized_demand,
    is_zero_demand,
    is_exact_duplicate_record,
    order_demand_net,
    order_demand_gross,
    order_demand_abs
)
SELECT
    row_id,
    product_code,
    warehouse,
    product_category,
    order_date,
    EXTRACT(YEAR FROM order_date)::INTEGER AS order_year,
    EXTRACT(MONTH FROM order_date)::INTEGER AS order_month,
    EXTRACT(QUARTER FROM order_date)::INTEGER AS order_quarter,
    STRFTIME(order_date, '%Y-%m') AS order_ym,
    EXTRACT(ISODOW FROM order_date)::INTEGER AS day_of_week,
    (order_date IS NULL) AS is_missing_date,
    is_parenthesized_demand,
    (order_demand_net = 0) AS is_zero_demand,
    (dup_seq > 1) AS is_exact_duplicate_record,
    order_demand_net,
    GREATEST(order_demand_net, 0) AS order_demand_gross,
    ABS(order_demand_net) AS order_demand_abs
FROM flagged;

-- 2. Dimensi Gudang (Warehouse)
DROP TABLE IF EXISTS analytics.dim_warehouse;
CREATE TABLE analytics.dim_warehouse AS
SELECT
    warehouse,
    COUNT(*) AS total_records,
    SUM(CASE WHEN NOT is_missing_date THEN 1 ELSE 0 END) AS dated_records,
    SUM(CASE WHEN is_missing_date THEN 1 ELSE 0 END) AS missing_date_records,
    COUNT(DISTINCT product_code) AS distinct_skus,
    COUNT(DISTINCT product_category) AS distinct_categories,
    SUM(order_demand_gross) AS total_gross_demand,
    SUM(order_demand_net) AS total_net_demand,
    SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END) AS total_return_units,
    SUM(CASE WHEN is_parenthesized_demand THEN 1 ELSE 0 END) AS return_record_count,
    ROUND(100.0 * SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END) / NULLIF(SUM(order_demand_gross), 0), 4) AS return_rate_pct,
    MIN(order_date) AS first_order_date,
    MAX(order_date) AS last_order_date
FROM analytics.clean_product_demand
GROUP BY warehouse;

-- 3. Dimensi Kategori Produk
DROP TABLE IF EXISTS analytics.dim_category;
CREATE TABLE analytics.dim_category AS
SELECT
    product_category,
    COUNT(*) AS total_records,
    COUNT(DISTINCT product_code) AS distinct_skus,
    COUNT(DISTINCT warehouse) AS distinct_warehouses,
    SUM(order_demand_gross) AS total_gross_demand,
    SUM(order_demand_net) AS total_net_demand,
    SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END) AS total_return_units,
    ROUND(100.0 * SUM(order_demand_net) / SUM(SUM(order_demand_net)) OVER (), 4) AS share_of_net_demand_pct
FROM analytics.clean_product_demand
GROUP BY product_category;

-- 4. Dimensi Produk (SKU) pada seluruh periode & periode penuh 2012-2016
DROP TABLE IF EXISTS analytics.dim_product;
CREATE TABLE analytics.dim_product AS
WITH sku_wh AS (
    SELECT
        product_code,
        warehouse,
        SUM(order_demand_net) AS wh_net_demand,
        ROW_NUMBER() OVER (PARTITION BY product_code ORDER BY SUM(order_demand_net) DESC, warehouse ASC) AS rn
    FROM analytics.clean_product_demand
    GROUP BY product_code, warehouse
)
SELECT
    c.product_code,
    MAX(c.product_category) AS product_category,
    COUNT(DISTINCT c.warehouse) AS warehouse_count,
    MAX(CASE WHEN sw.rn = 1 THEN sw.warehouse END) AS primary_warehouse,
    COUNT(*) AS total_records,
    COUNT(DISTINCT CASE WHEN c.order_year BETWEEN 2012 AND 2016 THEN c.order_ym END) AS active_months_2012_2016,
    MIN(c.order_date) AS first_order_date,
    MAX(c.order_date) AS last_order_date,
    SUM(c.order_demand_gross) AS total_gross_demand,
    SUM(c.order_demand_net) AS total_net_demand,
    SUM(CASE WHEN c.order_year BETWEEN 2012 AND 2016 THEN c.order_demand_net ELSE 0 END) AS net_demand_2012_2016,
    SUM(CASE WHEN c.order_year BETWEEN 2012 AND 2016 THEN c.order_demand_gross ELSE 0 END) AS gross_demand_2012_2016,
    SUM(CASE WHEN c.order_demand_net < 0 THEN ABS(c.order_demand_net) ELSE 0 END) AS total_return_units
FROM analytics.clean_product_demand c
LEFT JOIN sku_wh sw
    ON c.product_code = sw.product_code AND c.warehouse = sw.warehouse
GROUP BY c.product_code;

-- 5. Agregat Bulanan Gudang x Kategori (Periode Penuh 2012-2016 untuk analisis deret waktu bersih)
DROP TABLE IF EXISTS analytics.agg_monthly_demand;
CREATE TABLE analytics.agg_monthly_demand AS
SELECT
    order_ym,
    order_year,
    order_month,
    order_quarter,
    MAKE_DATE(order_year, order_month, 1) AS month_start_date,
    warehouse,
    product_category,
    COUNT(*) AS order_lines,
    COUNT(DISTINCT product_code) AS active_skus,
    SUM(order_demand_gross) AS gross_demand,
    SUM(order_demand_net) AS net_demand,
    SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END) AS return_units,
    SUM(CASE WHEN is_parenthesized_demand THEN 1 ELSE 0 END) AS return_lines,
    SUM(CASE WHEN is_zero_demand THEN 1 ELSE 0 END) AS zero_lines
FROM analytics.clean_product_demand
WHERE NOT is_missing_date
  AND order_year BETWEEN 2012 AND 2016
GROUP BY 1, 2, 3, 4, 5, 6, 7;

-- 6. Agregat Bulanan per SKU (2012-2016) untuk ABC-XYZ dan Syntetos-Boylan
DROP TABLE IF EXISTS analytics.agg_sku_monthly;
CREATE TABLE analytics.agg_sku_monthly AS
SELECT
    product_code,
    MAX(product_category) AS product_category,
    order_ym,
    order_year,
    order_month,
    COUNT(*) AS order_lines,
    SUM(order_demand_gross) AS gross_demand,
    SUM(order_demand_net) AS net_demand
FROM analytics.clean_product_demand
WHERE NOT is_missing_date
  AND order_year BETWEEN 2012 AND 2016
GROUP BY product_code, order_ym, order_year, order_month;
