# Synthetic Datasets & Load Testing Suite
### Operation Vajra — Offline Money Mule Detection & Forensic Workbench

This directory contains standalone, curated synthetic test datasets designed to evaluate and verify:
1. **Multi-Hop Traversal Speed & Accuracy** (sub-second FIFO taint propagation)
2. **Real-Time CSV Ingestion & Indexing Throughput** (streaming SHA-256 hash, DuckDB normalization, CSR adjacency construction)
3. **Mule Network Topology Detection** (smurfing, pooling/aggregation, circular churn, and high-density stress testing)
4. **Dynamic Column Alias Mapping** (adapting to non-standard bank export headers via `schema_map.yaml`)

You can upload any of these files directly through the **Load Data** tab on the workbench (`http://127.0.0.1:8000/`) to test upload performance, SHA-256 hash generation, and money trail tracing.

---

## Dataset Catalog & Testing Matrix

| Filename | Typology & Standard | Rows | Nodes / Edges | Victim Account | Fraud Loss | Expected Ingestion Time |
|---|---|---|---|---|---|---|
| [`scenario_1_fast_smurfing.csv`](./scenario_1_fast_smurfing.csv) | Fast Smurfing & Layering (IEEE Mobile AML) | 2,559 | 267 nodes / 553 edges | `SBIN10009901` | ₹12,50,000 | **~0.15s** |
| [`scenario_2_investment_scam.csv`](./scenario_2_investment_scam.csv) | Investment Scam Pooling (IBM Watson AML) | 4,068 | 357 nodes / 1,057 edges | `SBIN10008000` | ₹25,00,000 | **~0.22s** |
| [`scenario_3_cyclic_ring.csv`](./scenario_3_cyclic_ring.csv) | Circular Laundering & Churn (Nature Sci Rep 2025) | 3,012 | 263 nodes / 605 edges | `AXIS10007701` | ₹18,00,000 | **~0.18s** |
| [`scenario_4_mega_capacity_stress_test_500nodes.csv`](./scenario_4_mega_capacity_stress_test_500nodes.csv) | Mega Capacity Limit Test (PRD Stress Boundary) | 4,513 | 511 nodes / 1,650 edges | `SBIN10005001` | ₹5,00,00,000 | **~0.28s** |
| [`sample_custom_export.csv`](./sample_custom_export.csv) | Non-Standard Bank Column Alias Test | 21 | 18 nodes / 20 edges | `1000000011` | ₹50,100 | **<0.05s** |

---

## Detailed Scenario Breakdown

### 1. Scenario 1: Fast Smurfing Syndicate (`scenario_1_fast_smurfing.csv`)
- **Origin / Academic Reference:** Modeled on IEEE Mobile Anti-Money Laundering benchmarks.
- **Typology:** Micro-structuring under statutory ₹50,000 thresholds. A single victim transfer of ₹12,50,000 is immediately split across 4 Layer-1 collector mules, which rapidly disintegrate the funds into hundreds of ₹15,000–₹45,000 transfers within 15-minute bursts.
- **Primary Victim Account:** `SBIN10009901`
- **What to Observe in UI:**
  - Ingestion finishes in <0.2 seconds.
  - Multi-hop traversal reconstructs 4 distinct layering tiers.
  - The Sugiyama DAG layout separates L1 Collector nodes from high-fanout L2 smurfing dispensers.

---

### 2. Scenario 2: Investment Scam Pooling (`scenario_2_investment_scam.csv`)
- **Origin / Academic Reference:** Modeled on IBM Watson AML synthetic financial transaction graphs.
- **Typology:** Multi-victim fraud aggregation. Multiple distinct victim accounts (`SBIN10008000`, `SBIN10008001`, `SBIN10008002`, etc.) transfer large sums (`TASK_EARNING` and `VIP_INVESTMENT` narrations) into aggregator collector mules (`PUNB10008100`), which pool the funds and distribute them to overseas or headless device terminals.
- **Primary Victim Account:** `SBIN10008000`
- **What to Observe in UI:**
  - High in-degree aggregation on collector mule accounts.
  - Why-Flagged attribution score highlights Fan Topology score (+25.0) and Pass-Through Ratio (+30.0).

---

### 3. Scenario 3: Cyclic Laundering & Loop Churn (`scenario_3_cyclic_ring.csv`)
- **Origin / Academic Reference:** Nature Scientific Reports (2025) topology for cyclic transaction churn.
- **Typology:** Funds siphoned via a "Digital arrest bail release" scam are routed through circular 3-hop and 4-hop loops across private commercial banks (AXIS, SBIN, ICICI, HDFC) to artificially age funds and obscure lineage before funnelling into P2P crypto off-ramps (`UPI/WALLET_LOAD/P2P_CRYPTO`).
- **Primary Victim Account:** `AXIS10007701`
- **What to Observe in UI:**
  - GraphCanvas highlights circular edges with directed arrow animations.
  - Time slider allows investigating officers to step through the chronological sequence of cycles.

---

### 4. Scenario 4: Mega Capacity Limit Test (`scenario_4_mega_capacity_stress_test_500nodes.csv`)
- **Origin / Specification:** Specifically generated to test the PRD maximum boundary condition (500+ nodes, 1,500+ edges, ₹5 Crore fraud).
- **Typology:** Massive multi-tier syndicate with 511 accounts and 1,650 transactional flows. Simulates nationwide cybercrime ring operating across scheduled banks, payment banks, and fintech wallets.
- **Primary Victim Account:** `SBIN10005001`
- **What to Observe in UI:**
  - Multi-hop traversal completes in **< 1.0 ms** via the C-accelerated CSR engine.
  - Interactive canvas runs at **60 FPS** without browser lag.
  - Adaptive supernode clustering automatically activates for dense layers to prevent UI hairballs.

---

### 5. Custom Column Alias Demo (`sample_custom_export.csv`)
- **Typology:** A CSV file using non-canonical banking column names:
  - `Reference_Number` (maps to `txn_id`)
  - `from_account` (maps to `src_account`)
  - `to_account` (maps to `dst_account`)
  - `remitter_ifsc` (maps to `src_ifsc`)
  - `beneficiary_ifsc` (maps to `dst_ifsc`)
  - `Txn_Amount` (maps to `amount`)
  - `DateTime` (maps to `timestamp`)
  - `channel` (maps to `payment_mode`)
  - `remarks` (maps to `narration`)
  - `client_ip` (maps to `ip_address`)
  - `user_agent_type` (maps to `device_type`)
- **Primary Victim Account:** `1000000011`
- **What to Observe in UI:**
  - Automatically ingested without any schema conversion or code modifications via dynamic alias resolution in `schema_map.yaml`.

---

## How to Test Ingestion & Tracing Step-by-Step

1. Open the workbench at **`http://127.0.0.1:8000/`**.
2. Click **Load Data** in the left sidebar.
3. Drag & drop any CSV from this `synthetic_data/` folder (or click **Choose file** and browse to `synthetic_data/scenario_1_fast_smurfing.csv`).
4. Watch the real-time ingestion pipeline:
   - **Streaming SHA-256** checksum computation
   - **DuckDB bulk relational ingestion** & Parquet creation
   - **CSR Graph indexing** (< 0.3s)
   - **Downstream Behavioral Scoring** (0-100 Mule Risk Index)
5. Click **Launch Graph Workbench →** (or navigate to **Investigate**).
6. Enter the corresponding Victim Account ID listed in the table above (e.g. `SBIN10009901` for Scenario 1) and click **Trace Money Trail**.
7. Navigate to **Reports** to immediately generate the Section 192 BNSS Case Diary and statutory Bank Freeze notices (English & Hindi) with 100% electronic evidence verification.
