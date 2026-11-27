-- ============================================================================
-- 02_load_data.sql
-- Memuat data sumber CSV ke tabel raw.product_demand_raw tanpa mengubah nilai asli
-- ============================================================================

DELETE FROM raw.product_demand_raw;

INSERT INTO raw.product_demand_raw (
    row_id,
    product_code,
    warehouse,
    product_category,
    order_date_raw,
    order_demand_raw
)
SELECT
    ROW_NUMBER() OVER () AS row_id,
    "Product_Code"       AS product_code,
    "Warehouse"          AS warehouse,
    "Product_Category"   AS product_category,
    "Date"               AS order_date_raw,
    "Order_Demand"       AS order_demand_raw
FROM read_csv(
    'dataset/Historical Product Demand.csv',
    header = true,
    all_varchar = true,
    nullstr = ['', 'NA', 'NULL']
);
