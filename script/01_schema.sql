-- ============================================================================
-- 01_schema.sql
-- Skema tabel mentah (raw) dan tabel analitik bersih (clean/transformed)
-- Database target: DuckDB (sintaks SQL kompatibel PostgreSQL)
-- Proyek: Warehouse Product Demand and Forecasting Analysis
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Tabel mentah: menyimpan seluruh kolom asli sebagai VARCHAR agar data sumber tetap utuh
DROP TABLE IF EXISTS raw.product_demand_raw;
CREATE TABLE raw.product_demand_raw (
    row_id            BIGINT,
    product_code      VARCHAR,
    warehouse         VARCHAR,
    product_category  VARCHAR,
    order_date_raw    VARCHAR,
    order_demand_raw  VARCHAR
);

-- Tabel hasil pembersihan (terpisah dari raw)
DROP TABLE IF EXISTS analytics.clean_product_demand;
CREATE TABLE analytics.clean_product_demand (
    row_id                    BIGINT PRIMARY KEY,
    product_code              VARCHAR NOT NULL,
    warehouse                 VARCHAR NOT NULL,
    product_category          VARCHAR NOT NULL,
    order_date                DATE,
    order_year                INTEGER,
    order_month               INTEGER,
    order_quarter             INTEGER,
    order_ym                  VARCHAR,
    day_of_week               INTEGER,
    is_missing_date           BOOLEAN NOT NULL,
    is_parenthesized_demand   BOOLEAN NOT NULL,
    is_zero_demand            BOOLEAN NOT NULL,
    is_exact_duplicate_record BOOLEAN NOT NULL,
    order_demand_net          BIGINT NOT NULL,
    order_demand_gross        BIGINT NOT NULL,
    order_demand_abs          BIGINT NOT NULL
);
