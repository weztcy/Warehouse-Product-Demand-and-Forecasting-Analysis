"""Reproducible SQL pipeline runner for Warehouse Product Demand and Forecasting Analysis."""

from __future__ import annotations

import json
from pathlib import Path
import duckdb

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "dataset" / "demand_analytics.duckdb"
SCRIPT_DIR = ROOT / "script"
DATASET_DIR = ROOT / "dataset"

SQL_FILES = [
    "01_schema.sql",
    "02_load_data.sql",
    "03_data_quality.sql",
    "04_cleaning_transformation.sql",
    "05_eda.sql",
    "06_analysis.sql",
    "07_views.sql",
]


def split_statements(sql_text: str) -> list[str]:
    stmts: list[str] = []
    for raw_stmt in sql_text.split(";"):
        lines = [
            ln for ln in raw_stmt.splitlines() if ln.strip() and not ln.strip().startswith("--")
        ]
        if lines:
            stmts.append(raw_stmt.strip())
    return stmts


def main() -> None:
    con = duckdb.connect(str(DB_PATH))
    results_log: dict[str, list] = {}

    for fname in SQL_FILES:
        path = SCRIPT_DIR / fname
        sql_text = path.read_text(encoding="utf-8")
        stmts = split_statements(sql_text)
        file_outputs = []
        for idx, stmt in enumerate(stmts, start=1):
            cur = con.execute(stmt)
            if cur.description is not None:
                df = cur.fetchdf()
                if len(df) > 0 and not (list(df.columns) == ["Count"] and len(df) == 1) and not (list(df.columns) == ["Success"] and len(df) == 1):
                    file_outputs.append(
                        {
                            "query_index": idx,
                            "rows": int(len(df)),
                            "records": json.loads(df.head(50).to_json(orient="records", date_format="iso")),
                        }
                    )
        results_log[fname] = file_outputs

    # Export cleaned & transformed derivatives into dataset/ (preserving raw CSV untouched)
    con.execute(
        f"COPY analytics.clean_product_demand TO '{(DATASET_DIR / 'product_demand_cleaned.parquet').as_posix()}' (FORMAT PARQUET, COMPRESSION ZSTD)"
    )
    con.execute(
        f"COPY analytics.agg_monthly_demand TO '{(DATASET_DIR / 'product_demand_monthly_transformed.csv').as_posix()}' (HEADER, DELIMITER ',')"
    )
    con.execute(
        f"COPY analytics.agg_sku_forecast_profile TO '{(DATASET_DIR / 'product_demand_sku_profile.csv').as_posix()}' (HEADER, DELIMITER ',')"
    )

    # Strict reconciliation assertions
    raw_cnt = con.execute("SELECT COUNT(*) FROM raw.product_demand_raw").fetchone()[0]
    clean_cnt = con.execute("SELECT COUNT(*) FROM analytics.clean_product_demand").fetchone()[0]
    assert raw_cnt == clean_cnt == 1048575, f"Row mismatch: raw={raw_cnt}, clean={clean_cnt}"

    recon = con.execute(
        """
        SELECT
            SUM(order_demand_gross) AS gross_sum,
            SUM(CASE WHEN order_demand_net < 0 THEN ABS(order_demand_net) ELSE 0 END) AS return_sum,
            SUM(order_demand_net) AS net_sum
        FROM analytics.clean_product_demand
        """
    ).fetchone()
    assert recon[0] - recon[1] == recon[2], f"Reconciliation failed: {recon}"

    # Collect view outputs for documentation verification
    views = [
        "vw_kpi_summary",
        "vw_warehouse_performance",
        "vw_category_pareto",
        "vw_abc_xyz_matrix",
        "vw_seasonality_heatmap",
        "vw_data_quality_summary",
    ]
    view_dumps = {}
    for v in views:
        df = con.execute(f"SELECT * FROM analytics.{v}").fetchdf()
        view_dumps[v] = json.loads(df.to_json(orient="records", date_format="iso"))

    for tbl in ["forecast_model_benchmark_2016", "forecast_projection_2017"]:
        df = con.execute(f"SELECT * FROM analytics.{tbl}").fetchdf()
        view_dumps[tbl] = json.loads(df.to_json(orient="records", date_format="iso"))

    df_top_sku = con.execute("SELECT * FROM analytics.vw_sku_forecast_leaderboard LIMIT 15").fetchdf()
    view_dumps["top_15_skus"] = json.loads(df_top_sku.to_json(orient="records", date_format="iso"))

    df_bt = con.execute(
        """
        SELECT
            warehouse,
            SUM(actual_demand) AS actual_2016,
            SUM(f_naive_1m) AS f_naive_1m,
            SUM(f_seasonal_naive_12m) AS f_seasonal_naive_12m,
            SUM(f_ma_3m) AS f_ma_3m,
            SUM(f_ma_6m) AS f_ma_6m,
            SUM(f_seasonal_ma6_hybrid) AS f_seasonal_ma6_hybrid,
            ROUND(100.0 * SUM(ABS(actual_demand - f_seasonal_ma6_hybrid)) / SUM(actual_demand), 2) AS hybrid_wape_pct,
            ROUND(100.0 * SUM(ABS(actual_demand - f_ma_6m)) / SUM(actual_demand), 2) AS ma6_wape_pct,
            ROUND(100.0 * SUM(ABS(actual_demand - f_seasonal_naive_12m)) / SUM(actual_demand), 2) AS snaive_wape_pct
        FROM analytics.forecast_backtest_warehouse_2016
        GROUP BY warehouse
        ORDER BY actual_2016 DESC
        """
    ).fetchdf()
    view_dumps["backtest_by_warehouse"] = json.loads(df_bt.to_json(orient="records", date_format="iso"))

    summary = {
        "reconciliation": {
            "raw_rows": int(raw_cnt),
            "clean_rows": int(clean_cnt),
            "all_gross_demand": int(recon[0]),
            "all_return_units": int(recon[1]),
            "all_net_demand": int(recon[2]),
        },
        "sql_query_outputs": results_log,
        "views": view_dumps,
    }
    out_json = DATASET_DIR / "sql_analysis_summary.json"
    out_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("Pipeline completed successfully. Reconciliation:", summary["reconciliation"])
    print("Benchmark 2016:")
    print(con.execute("SELECT * FROM analytics.forecast_model_benchmark_2016").fetchdf().to_string(index=False))
    con.close()


if __name__ == "__main__":
    main()
