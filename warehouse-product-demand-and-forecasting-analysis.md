# Portfolio Project Data — Warehouse Product Demand and Forecasting Analysis

- **Category:** `data-analysis` (`Data Analytics`)
- **Accent Color:** `emerald`
- **Target Assets Folder:** `public/images/projects/warehouse_product_demand_and/`
- **Required Local Images:** `banner.webp`, `slide01.webp` .. `slide15.webp`

## TypeScript Data (`ProjectCaseStudy`)

```typescript
{
  "id": "warehouse-product-demand-and-forecasting-analysis",
  "code": "PRO-75 // DA-08",
  "title": "Warehouse Product Demand and Forecasting Analysis",
  "category": "data-analysis",
  "categoryLabel": "Data Analytics",
  "year": "2026",
  "status": "Completed",
  "accentColor": "emerald",
  "repoUrl": "https://github.com/weztcy/Warehouse-Product-Demand-and-Forecasting-Analysis",
  "license": "MIT License",
  "banner": "/images/projects/warehouse_product_demand_and/banner.webp",
  "summary": "SQL demand forecasting across 2,160 SKUs and 4 warehouses using ABC-XYZ, Syntetos-Boylan segmentation, 2016 backtesting, and 2017 projections.",
  "projectDescription": "End-to-end DuckDB SQL analysis of 1,048,575 warehouse order records across 2,160 SKUs and 33 categories. Integrates ABC-XYZ and Syntetos-Boylan segmentation, leak-free 2016 forecasting backtests, 2017 baseline projections, and an interactive SQL dashboard.",
  "architectureSummary": "Raw CSV -> DuckDB SQL Staging & Cleaning -> Dimensional & 60-Month SKU Aggregates -> Backtest & 2017 Forecast Views -> Next.js SQL Dashboard & Canva Deck",
  "techStack": [
    "SQL",
    "DuckDB",
    "Python",
    "Pandas",
    "Parquet",
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "Canva"
  ],
  "telemetryMatrix": {
    "projectType": "SQL Demand & Forecasting Analytics",
    "targetPlatform": "DuckDB, Next.js SPA & Canva",
    "primaryDomain": "Supply Chain & Inventory Analytics",
    "architecturePipeline": "CSV -> DuckDB SQL -> Parquet -> Next.js",
    "testingAndAudit": "Verified",
    "projectStatus": "Completed",
    "projectYear": "2026"
  },
  "dataAnalyticsProjectInfo": {
    "projectType": "SQL Pipeline, Demand Segmentation & Forecasting Study",
    "developmentStatus": "Completed",
    "analysisYear": "2026",
    "dataDomain": "Multi-Warehouse Supply Chain & Inventory",
    "projectCategory": "Data Analytics"
  },
  "dataAnalyticsBusinessContext": "Multi-warehouse distribution across 2,160 SKUs, 33 categories, and four facilities faced severe Pareto skew, a sharp 10.05% contraction in 2016, and concentrated missing dates plus returns in Whse_A. Without segmented profiling and adaptive baselines, static annual forecasts risk costly overstocking.",
  "dataAnalyticsAnalyticalObjectives": [
    {
      "title": "Reconcile Gross, Return, and Net Demand",
      "description": "Separate positive order quantities from parenthesized negative adjustments and undated records to establish 100% auditable demand metrics across the 60-month 2012-2016 window.",
      "targetMetric": "100% Row & Unit Reconciliation"
    },
    {
      "title": "Segment SKU Concentration & Predictability",
      "description": "Map Pareto volume concentration and demand stability across 2,160 SKUs using ABC-XYZ tiers and Syntetos-Boylan ADI and CV-squared thresholds.",
      "targetMetric": "ABC-XYZ & Syntetos-Boylan Matrix"
    },
    {
      "title": "Benchmark Forecasting Baselines Without Leakage",
      "description": "Evaluate five monthly baseline forecasting models on a 2016 out-of-sample holdout across 48 warehouse-month series trained strictly on 2012-2015 history.",
      "targetMetric": "Minimum WAPE, MAE, RMSE & Bias"
    },
    {
      "title": "Calibrate 2017 Warehouse Demand Projections",
      "description": "Generate monthly 2017 baseline forecasts per warehouse anchored on recent H2 2016 demand levels, historical seasonal indices, and WAPE uncertainty bands.",
      "targetMetric": "2017 Baseline & Uncertainty Range"
    }
  ],
  "dataAnalyticsDatasetOverview": {
    "dataSource": "Historical Product Demand CSV (raw order-demand ledger)",
    "dataPeriod": "2011-01-08 to 2017-01-09 (60 full months: 2012-2016)",
    "recordsCount": "1,048,575 Records",
    "variablesCount": "5 Source Columns (17 Cleaned)",
    "description": "Order-line demand ledger covering 2,160 unique SKUs, 33 product categories, and 4 warehouses (Whse_J, Whse_S, Whse_C, Whse_A), alongside ZSTD Parquet and aggregated CSV derivatives."
  },
  "dataAnalyticsDataPreparation": [
    {
      "step": "01",
      "title": "Immutable Staging & Whitespace Normalization",
      "description": "Loaded all 1,048,575 raw CSV lines into raw.product_demand_raw as VARCHAR with synthetic row_id keys and trimmed trailing whitespace across 1,038,106 demand strings.",
      "badge": "Raw Staging"
    },
    {
      "step": "02",
      "title": "Signed Return Parsing & Gross-Net Separation",
      "description": "Detected 10,469 parenthesized negative entries (-20,735,500 units) via regex, converting them into signed order_demand_net and separating Gross Demand from Return Units.",
      "badge": "Signed Parsing"
    },
    {
      "step": "03",
      "title": "Missing-Date & Duplicate Audit Flagging",
      "description": "Preserved 11,239 undated Whse_A records (70.7% of Whse_A returns), 28,681 zero-demand rows, and 122,423 repeated 5-column records via explicit boolean quality flags without destructive deletion.",
      "badge": "Audit Flags"
    },
    {
      "step": "04",
      "title": "Full-Period Isolation & Dimensional Modeling",
      "description": "Isolated 2012-2016 (1,036,643 rows; 99.85% of net demand) from partial 2011 and Jan 2017 boundary slices, building dim_warehouse, dim_category, dim_product, and monthly aggregates.",
      "badge": "Star Schema"
    },
    {
      "step": "05",
      "title": "Zero-Padded 60-Month SKU Grid Construction",
      "description": "Cross-joined 2,160 SKUs across 60 full months (129,600 SKU-month slots) so inactive months register zero demand during CV, ADI, and CV-squared predictability scoring.",
      "badge": "60-Month Grid"
    }
  ],
  "analyticalMethodology": {
    "summary": "Non-destructive SQL auditing reconciles 1,048,575 raw records before profiling 2,160 SKUs across a zero-padded 60-month grid using ABC-XYZ and Syntetos-Boylan thresholds. Five baseline models are benchmarked on a leak-free 2016 holdout via WAPE, MAE, RMSE, and Bias to calibrate 2017 warehouse projections.",
    "methods": [
      {
        "name": "ABC-XYZ Inventory Segmentation",
        "description": "Ranked SKUs by cumulative 2012-2016 net demand (A <= 80%, B <= 95%, C > 95%) crossed with 60-month coefficient of variation tiers (X <= 0.50, Y <= 1.00, Z > 1.00).",
        "badge": "Pareto & Volatility"
      },
      {
        "name": "Syntetos-Boylan Demand Classification",
        "description": "Classified each SKU into Smooth, Erratic, Intermittent, or Lumpy regimes using standard ADI (< 1.32) and active-month squared CV (< 0.49) cutoffs.",
        "badge": "Predictability"
      },
      {
        "name": "Leak-Free Out-of-Sample Backtesting",
        "description": "Evaluated Naive (t-1), Seasonal Naive (t-12), Moving Average 3M, Moving Average 6M, and Seasonal-MA6 Hybrid across 48 warehouse-month points in 2016 using 2012-2015 seasonal indices.",
        "badge": "Time-Series Backtest"
      },
      {
        "name": "Multiplicative Seasonal Baseline Projection",
        "description": "Combined H2 2016 warehouse demand levels with 2012-2016 monthly seasonal indices and warehouse-specific backtest WAPE error bands to project 2017 monthly demand.",
        "badge": "2017 Forecast"
      }
    ]
  },
  "analysisWorkflow": {
    "summary": "Ten-stage reproducible analytical lifecycle spanning business framing, DuckDB SQL data engineering, statistical backtesting, Next.js dashboard delivery, and Canva executive storytelling.",
    "steps": [
      {
        "stepNumber": "01",
        "phase": "Business Understanding",
        "title": "Problem Framing & KPI Specification",
        "description": "Defined Gross, Return, Net Demand, Return Rate, Class A concentration, WAPE, and Forecast Bias KPIs aligned with dataset granularity."
      },
      {
        "stepNumber": "02",
        "phase": "Data Understanding",
        "title": "Schema, Cardinality & Boundary Inspection",
        "description": "Profiled 1,048,575 raw rows, confirmed strict N:1 SKU-to-category mapping, and flagged partial 2011/2017 periods plus the spreadsheet row boundary."
      },
      {
        "stepNumber": "03",
        "phase": "Quality Assessment",
        "title": "Completeness, Validity & Anomaly Audit",
        "description": "Quantified 11,239 undated Whse_A rows, 10,469 parenthesized returns, 28,681 zero-demand lines, and 122,423 repeated 5-column records."
      },
      {
        "stepNumber": "04",
        "phase": "Data Cleaning",
        "title": "Non-Destructive SQL Standardization",
        "description": "Built analytics.clean_product_demand and exported compressed Parquet with automated row and unit reconciliation assertions."
      },
      {
        "stepNumber": "05",
        "phase": "Data Transformation",
        "title": "Star Schema & 60-Month Grid Engineering",
        "description": "Constructed dimensional tables, monthly warehouse-category aggregates, and a 129,600-cell SKU-month matrix for 2012-2016."
      },
      {
        "stepNumber": "06",
        "phase": "Exploratory Analysis",
        "title": "Growth, Warehouse Divergence & Seasonality",
        "description": "Identified deceleration into a -10.05% 2016 contraction driven by Whse_S (-41.28%), March/July peaks, and weekday order concentration."
      },
      {
        "stepNumber": "07",
        "phase": "Statistical Analysis",
        "title": "ABC-XYZ, Syntetos-Boylan & 2016 Backtest",
        "description": "Executed SKU segmentation and benchmarked five forecasting baselines across 48 holdout points, establishing 2017 warehouse projections."
      },
      {
        "stepNumber": "08",
        "phase": "Data Visualization",
        "title": "Interactive Dark-Mode SQL Dashboard",
        "description": "Developed a Next.js and DuckDB SPA dashboard with warehouse and year filters plus verified full-page, 16:9, and 16:10 exports."
      },
      {
        "stepNumber": "09",
        "phase": "Insight Generation",
        "title": "Evidence Synthesis & Decision Boundaries",
        "description": "Separated verified descriptive patterns from commercial hypotheses requiring operational validation at Whse_S and Whse_A."
      },
      {
        "stepNumber": "10",
        "phase": "Presentation",
        "title": "15-Slide Executive Canva Deck",
        "description": "Published a 15-slide dark-mode executive presentation exported to PPTX and PDF alongside ten structured stage reports."
      }
    ]
  },
  "dataAnalyticsPresentationSlides": [
    {
      "slideNumber": 1,
      "title": "Cover Slide & Project Identity",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide01.webp"
    },
    {
      "slideNumber": 2,
      "title": "Executive Summary & Core KPI Highlights",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide02.webp"
    },
    {
      "slideNumber": 3,
      "title": "Business Context & Problem Statement",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide03.webp"
    },
    {
      "slideNumber": 4,
      "title": "Business Objectives & Analytical Questions",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide04.webp"
    },
    {
      "slideNumber": 5,
      "title": "Dataset Overview & Evaluation Scope",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide05.webp"
    },
    {
      "slideNumber": 6,
      "title": "Data Quality Audit & Preparation Reconciliation",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide06.webp"
    },
    {
      "slideNumber": 7,
      "title": "Analytical Methodology & Leak-Free Pipeline",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide07.webp"
    },
    {
      "slideNumber": 8,
      "title": "Overall Warehouse Performance & Return Rates",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide08.webp"
    },
    {
      "slideNumber": 9,
      "title": "Category Concentration & SKU Predictability",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide09.webp"
    },
    {
      "slideNumber": 10,
      "title": "Annual Growth Trajectory, Whse_S Shift & Seasonality",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide10.webp"
    },
    {
      "slideNumber": 11,
      "title": "2016 Backtest Benchmark & 2017 Baseline Projection",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide11.webp"
    },
    {
      "slideNumber": 12,
      "title": "Business Insights & Decision Boundaries",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide12.webp"
    },
    {
      "slideNumber": 13,
      "title": "Prioritized Recommendations & Action Plan",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide13.webp"
    },
    {
      "slideNumber": 14,
      "title": "Conclusion & Next Analytical Steps",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide14.webp"
    },
    {
      "slideNumber": 15,
      "title": "Appendix & Supporting Methodological Notes",
      "imageUrl": "/images/projects/warehouse_product_demand_and/slide15.webp"
    }
  ],
  "dataAnalyticsKeyFindings": [
    {
      "metricValue": "89.60%",
      "metricLabel": "Smooth SKU Volume Share",
      "title": "Predictable Core Dominates Throughput",
      "description": "Only 639 Smooth SKUs (29.58% of 2,160 SKUs) generate 4.57B units (89.60% of 2012-2016 net demand), anchored by 57 A-X Smooth SKUs accounting for 63.41% of volume with a 0.30 mean CV.",
      "impactTag": "Forecast Automation"
    },
    {
      "metricValue": "79.81%",
      "metricLabel": "Class A SKU Share",
      "title": "Severe SKU & Category Pareto Concentration",
      "description": "Just 84 Class A SKUs (3.89% of SKUs) drive 79.81% of 2012-2016 net demand, while Category_019 alone represents 82.67% (4.21B units) and the top four categories cover 96.93%.",
      "impactTag": "Pareto Focus"
    },
    {
      "metricValue": "-41.28%",
      "metricLabel": "Whse_S 2016 YoY Drop",
      "title": "Localized Structural Contraction in Whse_S",
      "description": "Network demand contracted -10.05% in 2016 primarily because Whse_S fell -41.28% (order lines -67.0%, returns up 6.1x), whereas Whse_C grew +4.55% and Whse_J dipped -2.16%.",
      "impactTag": "Operational Risk"
    },
    {
      "metricValue": "11.21%",
      "metricLabel": "MA-6 Backtest WAPE",
      "title": "6-Month Adaptive Models Beat Seasonal Naive",
      "description": "Moving Average 6M (11.21% WAPE, +1.13% bias) and Seasonal-MA6 Hybrid (11.29% WAPE, +1.19% bias) cut error by ~8 percentage points versus Seasonal Naive (19.29% WAPE, +11.17% bias).",
      "impactTag": "Model Accuracy"
    },
    {
      "metricValue": "5.22%",
      "metricLabel": "Whse_A Return Rate",
      "title": "Undated Returns Concentrated in Whse_A",
      "description": "All 11,239 missing-date rows reside in Whse_A and carry 70.7% of Whse_A return units (5.57M of 7.88M), producing a 5.22% return rate versus 0.18%-0.28% at other warehouses.",
      "impactTag": "Data Governance"
    }
  ],
  "recommendationsAndConclusion": {
    "recommendations": [
      {
        "title": "Deploy Segmented Forecasting for Smooth & Class A SKUs",
        "action": "Automate monthly replenishment baselines using Seasonal-MA6 Hybrid or MA-6 across 639 Smooth SKUs (89.60% volume) with weekly planner oversight on the 84 Class A SKUs.",
        "priority": "HIGH"
      },
      {
        "title": "Replace Static Annual Baselines with Adaptive 6M Windows",
        "action": "Retire Seasonal Naive (t-12) forecasting rules that generated +11.17% over-forecast bias in 2016 and adopt rolling 6-month deseasonalized baselines with level-shift alerts.",
        "priority": "HIGH"
      },
      {
        "title": "Enforce Date Validation & Audit Whse_A / Whse_S Operations",
        "action": "Mandate transaction dates on all Whse_A return postings (eliminating 11,239 undated records) and audit Whse_S commercial accounts behind the 67% order-line decline and 6.1x return surge.",
        "priority": "HIGH"
      },
      {
        "title": "Shift Erratic & Lumpy SKUs to Quantile Safety Stock",
        "action": "Manage the 1,414 Erratic and Lumpy SKUs (65.46% of SKUs but only 9.93% of volume) through Min-Max and quantile safety stock buffers rather than complex point forecasts.",
        "priority": "MEDIUM"
      },
      {
        "title": "Eliminate Spreadsheet-Bound Source Extraction Limits",
        "action": "Migrate order-demand extraction directly to database ETL pipelines to remove the 1,048,575-row spreadsheet ceiling and safeguard against silent data truncation.",
        "priority": "STRATEGIC"
      }
    ],
    "conclusion": "Replacing static seasonal naive rules with adaptive 6-month models lowers network forecast WAPE from 19.29% to 11.21%-11.29% and cuts bias from +11.17% to +1.13%. Focusing automation on 639 Smooth SKUs alongside Whse_A date governance and Whse_S audits delivers immediate planning gains."
  },
  "dataAnalyticsSupportingFiles": [
    {
      "name": "script/run_sql_pipeline.py",
      "format": "PY"
    },
    {
      "name": "script/01_schema.sql .. script/07_views.sql",
      "format": "SQL"
    },
    {
      "name": "dataset/demand_analytics.duckdb",
      "format": "DUCKDB"
    },
    {
      "name": "dataset/product_demand_cleaned.parquet",
      "format": "PARQUET"
    },
    {
      "name": "dataset/product_demand_monthly_transformed.csv",
      "format": "CSV"
    },
    {
      "name": "dataset/product_demand_sku_profile.csv",
      "format": "CSV"
    },
    {
      "name": "dataset/sql_analysis_summary.json",
      "format": "JSON"
    },
    {
      "name": "dashboard/sql/src/components/DashboardClient.tsx",
      "format": "TSX"
    },
    {
      "name": "dashboard/exports/dashboard_full-page.png",
      "format": "PNG"
    },
    {
      "name": "presentation/Warehouse Product Demand and Forecasting Analysis.pptx",
      "format": "PPTX"
    },
    {
      "name": "presentation/Warehouse Product Demand and Forecasting Analysis.pdf",
      "format": "PDF"
    }
  ]
}
```
