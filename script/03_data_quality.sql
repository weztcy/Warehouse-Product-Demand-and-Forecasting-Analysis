-- ============================================================================
-- 03_data_quality.sql
-- Audit kualitas data, kelengkapan, validitas, duplikasi, cakupan tahun, & anomali
-- ============================================================================

-- 1. Ringkasan volume & kelengkapan per kolom
SELECT
    COUNT(*) AS total_rows,
    COUNT(product_code) AS non_null_product_code,
    COUNT(warehouse) AS non_null_warehouse,
    COUNT(product_category) AS non_null_product_category,
    COUNT(order_date_raw) AS non_null_order_date,
    COUNT(*) - COUNT(order_date_raw) AS missing_order_date,
    ROUND(100.0 * (COUNT(*) - COUNT(order_date_raw)) / COUNT(*), 4) AS pct_missing_order_date,
    COUNT(order_demand_raw) AS non_null_order_demand,
    COUNT(DISTINCT product_code) AS distinct_products,
    COUNT(DISTINCT warehouse) AS distinct_warehouses,
    COUNT(DISTINCT product_category) AS distinct_categories,
    COUNT(DISTINCT order_date_raw) AS distinct_dates
FROM raw.product_demand_raw;

-- 2. Sebaran missing date menurut gudang
SELECT
    warehouse,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN order_date_raw IS NULL THEN 1 ELSE 0 END) AS missing_date_rows,
    ROUND(100.0 * SUM(CASE WHEN order_date_raw IS NULL THEN 1 ELSE 0 END) / COUNT(*), 4) AS pct_missing_date
FROM raw.product_demand_raw
GROUP BY warehouse
ORDER BY missing_date_rows DESC, warehouse;

-- 3. Validitas format Order_Demand dan deteksi nilai bertanda kurung / trailing space / nol
WITH parsed AS (
    SELECT
        row_id,
        product_code,
        warehouse,
        product_category,
        order_date_raw,
        order_demand_raw,
        TRIM(order_demand_raw) AS trimmed_demand,
        REGEXP_MATCHES(TRIM(order_demand_raw), '^\(\d+\)$') AS is_parenthesized,
        REGEXP_MATCHES(TRIM(order_demand_raw), '^\d+$') AS is_plain_integer,
        CASE
            WHEN REGEXP_MATCHES(TRIM(order_demand_raw), '^\(\d+\)$')
                THEN -CAST(REGEXP_REPLACE(TRIM(order_demand_raw), '[()]', '', 'g') AS BIGINT)
            WHEN REGEXP_MATCHES(TRIM(order_demand_raw), '^\d+$')
                THEN CAST(TRIM(order_demand_raw) AS BIGINT)
            ELSE NULL
        END AS parsed_demand
    FROM raw.product_demand_raw
)
SELECT
    COUNT(*) AS total_rows,
    SUM(CASE WHEN order_demand_raw <> TRIM(order_demand_raw) THEN 1 ELSE 0 END) AS trailing_or_leading_space_rows,
    SUM(CASE WHEN is_plain_integer THEN 1 ELSE 0 END) AS plain_integer_rows,
    SUM(CASE WHEN is_parenthesized THEN 1 ELSE 0 END) AS parenthesized_rows,
    SUM(CASE WHEN parsed_demand IS NULL THEN 1 ELSE 0 END) AS unparseable_rows,
    SUM(CASE WHEN parsed_demand = 0 THEN 1 ELSE 0 END) AS zero_demand_rows,
    SUM(CASE WHEN parsed_demand < 0 THEN 1 ELSE 0 END) AS negative_demand_rows,
    MIN(parsed_demand) AS min_demand,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY parsed_demand) AS p25_demand,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY parsed_demand) AS median_demand,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY parsed_demand) AS p75_demand,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY parsed_demand) AS p95_demand,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY parsed_demand) AS p99_demand,
    MAX(parsed_demand) AS max_demand,
    ROUND(AVG(parsed_demand), 2) AS mean_demand,
    ROUND(STDDEV_SAMP(parsed_demand), 2) AS stddev_demand
FROM parsed;

-- 4. Cek duplikasi penuh pada kombinasi seluruh 5 kolom asli
WITH dup_groups AS (
    SELECT
        product_code,
        warehouse,
        product_category,
        COALESCE(order_date_raw, '<NULL>') AS order_date_key,
        TRIM(order_demand_raw) AS order_demand_key,
        COUNT(*) AS grp_cnt
    FROM raw.product_demand_raw
    GROUP BY 1, 2, 3, 4, 5
)
SELECT
    COUNT(*) AS unique_5col_combinations,
    SUM(CASE WHEN grp_cnt > 1 THEN 1 ELSE 0 END) AS duplicated_groups,
    SUM(CASE WHEN grp_cnt > 1 THEN grp_cnt - 1 ELSE 0 END) AS extra_duplicate_rows,
    SUM(grp_cnt) AS total_rows_reconciled
FROM dup_groups;

-- 5. Cek konsistensi hubungan Product_Code -> Product_Category (apakah 1 SKU hanya 1 kategori?)
WITH sku_cat AS (
    SELECT product_code, COUNT(DISTINCT product_category) AS cat_cnt
    FROM raw.product_demand_raw
    GROUP BY product_code
)
SELECT
    COUNT(*) AS total_skus,
    SUM(CASE WHEN cat_cnt > 1 THEN 1 ELSE 0 END) AS multi_category_skus
FROM sku_cat;

-- 6. Cek konsistensi hubungan Product_Code -> Warehouse (berapa SKU muncul di >1 gudang?)
WITH sku_wh AS (
    SELECT product_code, COUNT(DISTINCT warehouse) AS wh_cnt
    FROM raw.product_demand_raw
    GROUP BY product_code
)
SELECT
    wh_cnt AS warehouse_count_per_sku,
    COUNT(*) AS sku_count
FROM sku_wh
GROUP BY wh_cnt
ORDER BY wh_cnt;

-- 7. Cakupan tahun & jumlah baris serta bulan aktif per tahun
WITH dated AS (
    SELECT
        TRY_STRPTIME(order_date_raw, '%Y/%m/%d')::DATE AS dt,
        warehouse
    FROM raw.product_demand_raw
    WHERE order_date_raw IS NOT NULL
)
SELECT
    EXTRACT(YEAR FROM dt)::INTEGER AS yr,
    COUNT(*) AS row_count,
    COUNT(DISTINCT EXTRACT(MONTH FROM dt)) AS active_months,
    MIN(dt) AS min_date,
    MAX(dt) AS max_date
FROM dated
GROUP BY 1
ORDER BY 1;

-- 8. Audit nilai bertanda kurung menurut gudang
SELECT
    warehouse,
    COUNT(*) AS parenthesized_rows,
    SUM(CAST(REGEXP_REPLACE(TRIM(order_demand_raw), '[()]', '', 'g') AS BIGINT)) AS total_parenthesized_units
FROM raw.product_demand_raw
WHERE REGEXP_MATCHES(TRIM(order_demand_raw), '^\(\d+\)$')
GROUP BY warehouse
ORDER BY parenthesized_rows DESC;
