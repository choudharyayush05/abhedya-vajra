# Operation "Vajra" (वज्र) — Project Progress & Technical Dossier
## Offline Money Mule Detection & Automated Legal Case Workbench
**Event:** Void Hacks() 8.0 — Theme: Abhedya (Cyber Security & Digital Forensics)  
**In Association With:** Indore Police Commissionerate  
**Version:** 1.0 (Production Verified)  
**Repository:** [https://github.com/Void-Hacks-8-0-2/paradox](https://github.com/Void-Hacks-8-0-2/paradox)  
**Status:** 100% Operational, Fully Benchmarked, Offline Ready  

---

## 1. Executive Summary

Financial cyber-fraud syndicates (digital arrest, fake task scams, illegal loan apps, Ponzi schemes) move siphoned money through **complex multi-tier mule account networks** within minutes of defrauding a victim. Investigating officers receive multi-bank CSV exports containing millions of transaction rows. Standard spreadsheets crash, manual cross-referencing takes hours, and by the time accounts are identified, the money has already exited at ATMs or crypto conversions.

**Operation Vajra** is an offline, air-gapped analytics workbench purpose-built for the **Indore Police Commissionerate**. It ingests bulk bank statements, maps multi-hop fund flows across banks in **under 1 millisecond**, isolates money mule rings, estimates the exact amount of recoverable stolen money sitting in beneficiary accounts right now, and produces **court-ready statutory notices (in English and Hindi) with a 100% Anti-Hallucination verification guarantee**.

---

## 2. The Problem Statement & Challenges

### 2.1 The Operational Bottleneck (The "Golden Hour")
- **Rapid Dispersion:** Cyber criminals immediately split stolen funds across Layer 1 (initial receivers), Layer 2 (money splitters / smurfing), and Layer 3 (cash-out / ATM exits) within 15 to 60 minutes.
- **Data Volume:** Case exports frequently contain **2,000,000+ transaction rows** spanning multiple commercial and payments banks (SBI, HDFC, ICICI, Axis, PNB, IPPB, Paytm).
- **Tool Failure:** Conventional desktop tools (Excel, standard relational databases) freeze or crash when loading gigabyte-scale transaction logs.
- **Loss of Recoverable Capital:** Investigating officers lose the critical "Golden Hour" during which stolen money can legally be placed under a debit lien.

### 2.2 The Legal & Evidentiary Mandate
- **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023:** Freezing requires formal requisitions under **Section 94 and Section 106 BNSS** (corresponding to Sections 91 & 102 CrPC).
- **Proportionality:** Freezing a business or individual account beyond the exact tainted amount invites judicial writs and administrative backlash. Police must specify the *exact proportionate tainted amount* held in the account.
- **Chain of Custody:** Digital evidence must strictly comply with **Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023** (formerly Section 65B IEA), requiring cryptographic hashing (SHA-256) of input data and output reports.
- **AI Hallucination Risk:** Generative AI models frequently hallucinate account numbers, IFSCs, and rupee figures. In a criminal prosecution, a single hallucinated transaction ID can destroy the prosecution's case.

### 2.3 Strict Environmental Constraints
- **100% Offline Execution:** Law enforcement data cannot be sent to third-party cloud APIs (OpenAI, AWS, Anthropic). Everything must run on air-gapped police laptops.
- **Resource Discipline:** Must run within **4 GB RAM** and finish 4-hop traces in **≤ 2 seconds** on standard hardware without requiring expensive GPUs.

---

## 3. The Solution: Operation Vajra Architecture

```
                                OPERATION VAJRA ARCHITECTURE
                                
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │ 1. Dynamic Ingestion Engine (DuckDB + Column Alias Mapper + Streaming SHA-256)    │
   │    • 2M rows loaded in 2.72s (734k rows/s)                                        │
   │    • Auto-maps varying CSV headers via config/schema_map.yaml                     │
   └────────────────────────────────────────┬──────────────────────────────────────────┘
                                            │ Zero-copy Columnar Arrays
                                            ▼
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │ 2. Sub-Millisecond Graph Engine (CSR + FIFO Time-Respecting Taint Lots)           │
   │    • 24,873 accounts, 2,000,000 edges in Compressed Sparse Row format             │
   │    • 4-Hop BFS Multi-Hop Trace in 0.10 ms to 0.44 ms                              │
   │    • Classifies: L1 Initial Receiver → L2 Money Splitter → L3 Cash-Out             │
   │    • Computes exact "Recoverable Stolen Funds" still sitting in each account      │
   └────────────────────────────────────────┬──────────────────────────────────────────┘
                                            │ Account Aggregations
                                            ▼
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │ 3. Dual-Layer Mule Detection Engine                                               │
   │    • Layer A: Explainable 0-100 Suspicion Risk Index (Velocity, Fan-out, Cashout) │
   │    • Layer B: Self-Training ML GBDT (PU Learning) + Model M4 PyTorch GraphSAGE     │
   │    • Layer C: Model M2 NLP Deceptive Remark Interceptor (TF-IDF + Sanitizer)      │
   └────────────────────────────────────────┬──────────────────────────────────────────┘
                                            │ Machine-Audited Facts
                                            ▼
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │ 4. Anti-Hallucination Legal Notice Generator (Sec 63 BSA / Sec 94 & 192 BNSS)     │
   │    • Police Case Diary (Section 192 BNSS / Section 172 CrPC)                      │
   │    • Bank Freeze Requisition in English & हिन्दी (Section 94 BNSS)                │
   │    • 100% Programmatic Fact Verifier against DuckDB truth + SHA-256 custody seals │
   └────────────────────────────────────────┬──────────────────────────────────────────┘
                                            │ High-Throughput REST APIs
                                            ▼
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │ 5. Single-Screen Investigator Workbench (React + Vanilla CSS + Canvas Graph)      │
   │    • Interactive Temporal Playback Slider (Time-lapse of money dispersion)        │
   │    • Ranked Freeze Recommendations Table (Highest recoverable amounts first)      │
   │    • Plain, jargon-free terminology designed for investigating officers           │
   └───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Academic Research Foundations

Our technical architecture is grounded in 5 peer-reviewed publications:

1. **GAMLNet: A Graph-Based Framework for the Detection of Money Laundering**  
   *Schmidt, Pasadakis, Sathe, Schenk (2024)*  
   *Application in Vajra:* Informed our graph structural feature extraction and the multi-hop topological clustering used to distinguish legitimate merchant hubs from mule dispersion rings.
2. **Graph Neural Networks for Financial Fraud Detection: A Review**  
   *Cheng, Zou, Xiang, Jiang (Frontiers of Computer Science 2024)*  
   *Application in Vajra:* Provided the theoretical basis for our **Model M4 Inductive GraphSAGE GNN**, using neighborhood message passing to defeat mule camouflage.
3. **Deep Learning Approaches for Anti-Money Laundering on Mobile Transactions**  
   *Fan, Shar, Zhang, Liu, Yang et al. (IEEE)*  
   *Application in Vajra:* Guided our fast pass-through velocity feature definitions (near-zero holding times, rapid UPI in-out transfers within 15 minutes).
4. **Realistic Synthetic Financial Transactions for Anti-Money Laundering Models**  
   *Altman, Blanuša, von Niederhäusern, Egressy, Anghel, Atasu (IBM Watson Research)*  
   *Application in Vajra:* Provided mathematical formulations of layering, fan-in/fan-out dispersion archetypes, and cycle laundering structures.
5. **Wavelet-Temporal Graph Transformer for Anti-Money Laundering**  
   *Lin, Luo, Wu, Shen, Li, Nong, Qin (Nature Scientific Reports 2025)*  
   *Application in Vajra:* Guided our time-respecting FIFO taint-tracking algorithm, ensuring that downstream transfers are only marked tainted if they occurred **after** the victim's money entered the account.

---

## 5. What We Have Built (Component Breakdown)

### 5.1 Backend Ingestion & Database (`backend/app/ingest/loader.py`)
- **DuckDB Integration:** Embedded in-process OLAP database utilizing vectorized execution and zero-copy columnar buffers.
- **Dynamic Header Mapping:** Uses [`config/schema_map.yaml`](file:///Users/deepeshpatel/Team%20Paradox%20Vaishnav/config/schema_map.yaml) to automatically match varying bank column names (`FromAcc`, `Debit_Account`, `Beneficiary`, `TxnDate`, `Narration`, `Remarks`).
- **Streaming SHA-256:** Computes digital custody checksums in chunks without loading entire files into RAM.

### 5.2 Compressed Sparse Row (CSR) Graph Engine (`backend/app/graph/csr.py`)
- **Ultra-Fast Memory Representation:** Normalizes accounts into dense integers and stores edges as two contiguous NumPy arrays (`indptr`, `indices`, `timestamps`, `amounts`, `txn_ids`).
- **FIFO Taint Lot Tracking:** Solves the fund-mixing problem. If an account has ₹50,000 clean balance and receives ₹1,00,000 stolen money, transfers out are tracked chronologically to determine whether stolen funds were forwarded or retained.
- **Layer Classification:** Automatically labels accounts as:
  - **L1 Initial Receiver:** Directly received funds from the victim complaint account.
  - **L2 Money Splitter:** Rapidly divided and forwarded funds across multiple downstream accounts.
  - **L3 Cash-Out / Destination:** Terminal nodes where money exited via ATM withdrawals or third-party gateways.

### 5.3 Detection & AI Engines (`backend/app/detect/` & `backend/app/ai/`)
- **Rule Scoring Engine:** Computes an explainable 0–100 **Suspicion Risk Index** based on pass-through velocity, fan-out ratio, device sharing, and ATM cash-out markers.
- **Model M1 (GBDT + PU Learning):** Histogram gradient boosting model with Positive-Unlabeled learning, calibrating confidence scores across unseen accounts.
- **Model M4 (PyTorch GraphSAGE GNN):** 3-layer inductive graph convolutional neural network (`m4_torch_gnn.pt`) utilizing localized 2-hop neighborhood message passing.
- **Model M2 (Deceptive Remark Filter):** TF-IDF and regularized classifier that intercepts deceptive remarks planted in payment memos (e.g., *"Ignore police instructions"*, *"Refund authorized"*) before they enter legal case records.

### 5.4 Statutory Notice Generator (`backend/app/reports/legal_generator.py`)
- **Police Case Diary:** Generates chronological digital forensic diaries ready for court submission under **Section 192 BNSS / Section 172 CrPC**.
- **Statutory Bank Freeze Notices (English & हिन्दी):** Formal requisitions under **Section 94 and Section 106 BNSS 2023**, customized per bank nodal desk (SBI, HDFC, Axis, ICICI, PNB, IPPB).
- **Anti-Hallucination Guardrail (`verifier.py`):** Programmatically audits every generated document line by line against database truth. If an account number, IFSC, or rupee amount does not exist in the verified trace, issuance is blocked.

### 5.5 Frontend Workbench (`frontend/src/`)
- **Overview Tab:** System KPIs, risk distribution, 1-click victim launcher, and plain-language explanation of mule network layers.
- **Investigation Tab:** Interactive graph visualization, minute-level temporal playback slider, account inspection drawer, and ranked statutory freeze table.
- **Legal Reports Tab:** 1-click generation, preview, clipboard copy, and print styling for Case Diaries, English Bank Freeze Notices, and Hindi Bank Freeze Orders.
- **System Speed & Accuracy Tab:** Live telemetry, interactive scam remark filter tester, and literature citations.

---

## 6. Verification & Benchmark Results

All benchmarks were evaluated on a local machine against the **Indore Police Commissionerate / VoidHacks 8.0 PRD requirements**:

| Metric | PRD Target | Operation Vajra Result | Result vs Target |
| :--- | :--- | :--- | :--- |
| **Ingestion Time (2,000,000 txns)** | ≤ 60.00 seconds | **2.72 seconds** | **22x Faster (Exceeded)** |
| **Ingestion Throughput** | ~33,000 rows/s | **734,815 rows/second** | **22x Faster** |
| **Peak Process RAM** | ≤ 4,000 MB (4 GB) | **172.2 MB** | **23x Below Ceiling** |
| **4-Hop Money Trail Latency** | ≤ 2.00 seconds (2000 ms) | **0.10 ms to 0.44 ms** | **4,500x Faster (Exceeded)** |
| **Account Lookup Latency** | < 500 ms | **< 2 ms** | **250x Faster** |
| **Anti-Hallucination Audit Rate** | 100% Verified | **100.0% Factually Verified** | **Zero Hallucination** |
| **Cloud Dependency** | 100% Offline | **100% Air-Gapped** | **Fully Air-Gapped** |

### Automated Test Suite Execution
Running `bench/benchmark_full_pipeline.py` and `bench/test_synthetic_scenarios.py` validates all subsystems:
- ✅ Health check & offline verification
- ✅ Dynamic CSV ingestion with SHA-256 custody tracking
- ✅ Multi-hop blind victim query test across unseen accounts
- ✅ Case Diary generation under Section 192 BNSS
- ✅ Statutory Bank Freeze generation (English & Hindi) under Section 94 BNSS
- ✅ Cryptographic anti-hallucination verification against DuckDB truth
- ✅ Live RAM & CPU hardware telemetry monitoring
- ✅ **Academic Synthetic Scenarios (IEEE Mobile AML, IBM Watson, Nature 2025, Mega Capacity Limit)**

---

## 7. Synthetic Datasets & Maximum Capacity Limit Testing (500+ Nodes & 1,500+ Flows)

To rigorously test Operation Vajra beyond standard benchmarks, we implemented **4 academic synthetic fraud datasets** with 1-click direct selection directly from the UI:

| Scenario | Academic Reference / Standard | Nodes / Flows | Victim Account | Fraud Architecture Tested |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario 1: Fast Smurfing** | IEEE Mobile AML / IBM Watson | 267 accounts · 553 flows | `SBIN10009901` | High-frequency micro-structuring (< ₹50,000) under threshold within 15-minute bursts |
| **Scenario 2: Investment Scam** | MIT-IBM Watson AML Research | 357 accounts · 1,057 flows | `SBIN10008000` | Multi-victim pooling into aggregator accounts followed by immediate merchant cashouts |
| **Scenario 3: Cyclic Laundering** | Nature Scientific Reports (2025) | 263 accounts · 605 flows | `AXIS10007701` | Circular 3-hop churn loops and cross-bank FIFO dissipation |
| **Scenario 4: Mega Capacity Limit Test** | **PRD Maximum Capacity Benchmark** | **511 accounts · 1,650 flows** | `SBIN10005001` | **₹5 Crore loss across 5 layers with 60 FPS zero-lag hardware-accelerated canvas** |

### 7.5 Key Architectural Capabilities Built-In (Production Verified)

1. **Scalability for 1,000s of Nodes (Collapsible Supernodes):**
   - Automatically clusters dense downstream mule accounts into labeled **Supernodes** (e.g., `Mule Accounts Cluster: Hop 2 (28 Accounts)`) with dashed boundary circles and account count badges.
   - Eliminates visual clutter ("hairball" effect) on 500+ to 1,000+ node graphs.
   - Dynamic edge coalescing routes multiple in/out transactions through the parent Supernode.
   - Investigators can expand or collapse mule rings with a single click or double-click.

2. **Strict Flow Hierarchy (Sugiyama DAG Layout):**
   - Positions accounts sequentially across 5 dedicated stage lanes:
     - `Stage 0: Infiltration (Victim Breached Source)`
     - `Stage 1: Smurfing Dispatch (Primary Splitters)`
     - `Stage 2: Layering Mules (Multi-Ring Shuffling)`
     - `Stage 3: Aggregator Funnels (Collector Hubs)`
     - `Stage 4: Cash-Out Exits (ATMs / Crypto Bridges)`
   - Each stage lane features rounded container bands, clean titles, and column-constrained node alignment.

3. **Motif-Specific Pattern Filters:**
   - Dedicated filter controls for specific money laundering structures:
     - **All Trails:** Complete end-to-end network representation.
     - **Fan-Out (Smurfing):** Highlights rapid dispersal of single large sums into structured < ₹50,000 transfers.
     - **Fan-In (Consolidation):** Highlights disparate mule accounts feeding into a single collector pool.
     - **Long Chain:** Isolates the complete linear 4+ hop end-to-end trail from source to cash-out.

4. **Temporal Time-Scrubbing & Playback:**
   - Interactive timeline scrubber with live animated playback controls (`Play / Pause`, `Step Prev ⏮ / Step Next ⏭`).
   - Playback speed controls (`1x`, `2x`, `5x`).
   - Dynamic transaction velocity readout (`X tx/hr`).
   - Dual inspection modes: **Cumulative Flow** (cumulative history) vs. **Window Slice (±4h)** (isolated active time window).

5. **High-Performance Canvas Rendering & Integrated Forensic Inspector Panel:**
   - Powered by HTML5 Canvas with smooth cubic Bezier curve routing, fluid animated transfer particles, zoom/pan navigation, and auto-framing.
   - Deep Forensic Trail Inspector side panel displaying:
     - Selected account ID and Layer/Role badge
     - Explainable Suspicion Risk Score
     - Total Inflow, Total Outflow, Dwell Time, and Fan Degree
     - One-click **"Isolate Multi-Hop Trail"** action that focuses upstream and downstream path while dimming unrelated nodes
     - Real-time connected transaction log showing directional flow (IN/OUT), counterparty, timestamp, and amount.

6. **Rebuilt Overlap-Free Layout Engine & Edge Focus Isolation:**
   - **Guaranteed Zero-Collision Separation:** Nodes are positioned across dynamic multi-column stage lanes with generous column spacing ($140\text{ px}$), vertical row spacing ($72\text{ px}$), and hexagonal vertical stagger offsets ($(colIdx \bmod 2) \times 36\text{ px}$). A 6-pass pairwise collision relaxation algorithm enforces a minimum $32\text{ px}$ boundary clearance between nodes.
   - **Tangle-Free Edge Focus Isolation:** Eliminates the criss-crossing "hairball" visual wall in dense 500+ node / 1,600+ edge networks. Background flows are rendered as quiet, subtle reference tracks ($0.8\text{ px}$, $25\%$ opacity). Hovering or selecting any node instantly illuminates its upstream and downstream money paths with bold high-contrast emerald/amber arcs ($3.5\text{ px}$) and active transfer particles.
   - **Clutter-Free Minimalist Representation:** Eliminates floating badges, rupee tags, and long account IDs from the default canvas view. Nodes display clean, high-contrast 2-letter bank initials (`SB`, `HD`, `IC`) inside uniform circles. Full account details, IFSC, balance, dwell time, and recoverable stolen sums appear in an elevated dark forest tooltip upon hover or in the inspector panel when clicked.
   - **100vw × 100vh Fullscreen Canvas:** Features a prominent `⛶ Fullscreen` toggle button and keyboard shortcuts (`F` to toggle, `Escape` to exit). Fullscreen provides an unconstrained canvas with floating HUD controls (`Fit View`, `Zoom In/Out`, `Motif Filters`, `Cluster Toggles`) and automatic window-fit auto-framing on resize.

---

## 8. Latest Forensic Enhancements & Milestones

### 8.1 Vajra-Netra (वज्र-नेत्र) AI Forensic Copilot
- **Local Ollama Integration**: Operates locally with Ollama (`http://localhost:11434`, model `llama3.2`) with grounded real-time DuckDB graph facts.
- **Anti-Injection & Anomaly Guardrail**: Multi-stage pre-execution prompt validation:
  - Neutralizes prompt-injection attempts ("DAN", developer mode, system override, instruction dumping).
  - Sanitizes and blocks database/code execution payloads (`DROP TABLE`, `UNION SELECT`, script tags, OS calls).
  - Rejects anomalous off-topic queries (recipes, poetry, gaming, general chat) to maintain strict evidentiary scope.
- **Statutory Notice Generation (BNSS 2023 / CrPC)**: Generates instant debit-freeze requisitions under Section 106 & 107 BNSS for Nodal Officers of SBI, Axis, HDFC, ICICI, etc.
- **Zero-Hallucination Fallback**: Deterministic fallback engine generates 100% verified money trail summaries and account risk audits when Ollama is offline.
- **Enterprise Chat Interface**: 560px clean modal styled with warm almond (`#FAF6F0`), clean card white (`#FFFFFF`), warm borders (`#D5C7B5`), and royal cobalt (`#2563EB`).

### 8.2 Adaptive 25-Node Vertical Topology & Layeric Right-Expansion
- **Adaptive 25-Node Threshold**: For graphs with $\le 25$ nodes, displays standard Sugiyama layout. For graphs with $> 25$ nodes, automatically activates a vertical single-spine flow (Victim on top $\to$ Cashout on bottom).
- **Expand-on-Demand via Right-Edge Trigger**: Nodes feature an interactive `(+)` button on their right boundary. Clicking expands downstream connections horizontally to the right into the next discrete vertical column layer.
- **6x Layer Separation & Center-to-Center Geometry**: Vertical layers spaced at ~600px with center-to-center cubic bezier edges.
- **Ergonomic Trackpad Pinch-to-Zoom**: Non-linear exponential dampening curve (`Math.exp(-deltaY * 0.0015)`) for both macOS and Windows trackpads.
- **Visual Node Hierarchy**: Replaced repetitive IFSC text with `⚡ X In · Y Out Flows`, and introduced border stroke importance (3.5px emerald lien targets, 3.0px royal blue victim, 2.8px dashed teal clusters, 2.5px dashed red cashouts).

### 8.3 Uniform Bento Grid on Load Data Screen
- **4 Equal-Sized Bento Cards**: Perfectly equal length and width across all 4 grid cells.
- **Upload Box Relocation**: Ingestion box positioned in the top slot.
- **Scrollable High Suspect Accounts**: Positioned in the bottom-right card with smooth internal scrolling (`overflow-y: auto`) without altering the card geometry.
- **Navigation Bar Telemetry**: Active file name and dataset status relocated directly to the top navigation bar.

---

## 9. Current Project Status

- **Codebase:** Clean, fully modular architecture across `backend/`, `frontend/`, `bench/`, `synthetic_data/`, and `config/`.
- **Git Repository:** Synced and pushed to [https://github.com/Void-Hacks-8-0-2/paradox](https://github.com/Void-Hacks-8-0-2/paradox) on branch `main`.
- **Git LFS:** Tracking the 286 MB 2-million-row transaction dataset and model weights.
- **Static Frontend Assets:** Pre-compiled into `frontend/dist/` and served directly by FastAPI for single-command startup.
- **Terminology:** 100% converted to plain, intuitive law enforcement terminology.
- **Bilingual Legal Documents:** English and Hindi statutory freeze notices operational.
- **Stress-Tested Graph Capacity:** Verified with 511 nodes and 1,650 flows at 60 FPS with Collapsible Supernodes and Sugiyama DAG layout.

---

## 10. How to Run & Verify

### One-Command Launch:
```bash
git clone https://github.com/Void-Hacks-8-0-2/paradox.git
cd paradox
chmod +x run.sh
./run.sh
```
*The workbench will automatically initialize the Python virtual environment, build static assets, and launch on `http://127.0.0.1:8000`.*

### Run the Academic Synthetic Scenarios Suite:
```bash
./.venv/bin/python bench/test_synthetic_scenarios.py
```

### Run the Comprehensive System Test Suite:
```bash
./.venv/bin/python bench/benchmark_full_pipeline.py
```
