# 36-Hour Hackathon Build Plan — Operation “Vajra”

This plan is optimized around the jury weighting in the problem statement: Blind Victim Query **40%**, Detection Precision/Recall **30%**, Court-Ready Output **20%**, and Architecture/Engineering **10%**.

The key principle: **build the complete end-to-end path early, then improve detection and polish rather than spending the first half of the hackathon on infrastructure.**

## Target MVP Architecture

```text
                 ┌─────────────────────┐
                 │  2M Transaction CSV  │
                 └──────────┬──────────┘
                            │
                     Streaming Ingest
                            │
                   ┌────────▼────────┐
                   │ Polars / DuckDB │
                   │ Normalize+Index │
                   └────────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
       Graph Construction            Fast Queries
              │                           │
       ┌──────▼──────┐             ┌──────▼──────┐
       │ Risk Engine │             │ 4-Hop Trace │
       │ 0–100 Score │             │   <2 sec    │
       └──────┬──────┘             └──────┬──────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                    ┌───────▼────────┐
                    │   React UI     │
                    │ Graph + Search │
                    └───────┬────────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
       Case Narrative               Freeze Requisition
             │                             │
             └──────────────┬──────────────┘
                            │
                       Local AI Layer
                       + DB Guardrails
```

The problem specifically requires local/offline processing, 2M-row ingestion within 60 seconds, 4-hop tracing within 2 seconds, and responsive visualization of 500+ nodes/1,500+ edges.

---

# HOURS 0–3 — Understand + Freeze Architecture

## Hour 0–1: Requirement extraction

Create a single `REQUIREMENTS.md`.

Record the hard targets:

- 2M+ transactions
- ≤60 sec ingestion/indexing
- 4-hop trace ≤2 sec
- 0–100 Mule Risk Index
- L1/L2/L3 identification
- Interactive graph
- 15-day temporal playback
- Subgraph isolation/export
- Case Diary
- Bank Freeze Requisition
- AI must not hallucinate account numbers/amounts
- Completely local execution

## Hour 1–2: Freeze technology

**Recommended stack:**

| Layer | Choice |
|---|---|
| Data ingestion | Polars |
| Analytical DB | DuckDB |
| Backend | Python + FastAPI |
| Graph computation | NetworkX initially |
| Frontend | React + Vite |
| Graph | Cytoscape.js |
| Charts | Recharts |
| AI | Local LLM / configurable model |
| Validation | Pydantic |
| Packaging | Docker + local scripts |

Don't introduce Kafka, Spark, Kubernetes, Neo4j, etc. unless benchmarking proves they're necessary.

## Hour 2–3: Repository setup

```text
vajra/
│
├── backend/
│   ├── ingestion/
│   ├── graph/
│   ├── detection/
│   ├── tracing/
│   ├── api/
│   └── reports/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   └── graph/
│
├── data/
├── tests/
├── scripts/
├── docs/
├── docker/
└── README.md
```

**Checkpoint:** Every team member can clone/run the skeleton.

---

# HOURS 3–7 — Data Engine

This is the foundation because the challenge explicitly requires processing **2,000,000+ records without OOM** and fast historical account queries.

## Hour 3–5: Ingestion

Implement:

```text
CSV
 ↓
Polars LazyFrame
 ↓
Schema normalization
 ↓
Validation
 ↓
DuckDB
 ↓
Indexes / derived tables
```

Normalize:

- Transaction ID
- Sender account
- Receiver account
- Sender IFSC
- Receiver IFSC
- Amount
- Timestamp
- Payment mode
- Narration
- IP
- Device

These are the 11 dataset columns specified in the challenge.

## Hour 5–6: Derived features

Precompute:

```text
account_stats
transaction_edges
incoming_stats
outgoing_stats
velocity_stats
device_stats
ip_stats
```

## Hour 6–7: Benchmark

Run:

```text
2M rows
→ ingestion time
→ indexing time
→ memory usage
→ account lookup time
```

### Checkpoint #1

You should now be able to demonstrate:

> “2 million records loaded locally and searchable.”

Do not proceed until this works.

---

# HOURS 7–12 — Mule Detection Engine

This deserves significant time because detection accounts for **30% of judging**, including identifying 1,500 injected mule accounts while minimizing false positives.

## Hour 7–8: Account graph

Represent:

```text
Account A
   │ ₹50,000
   ▼
Account B
   │ ₹48,000
   ▼
Account C
```

Edge:

```text
sender → receiver
```

Store:

```text
source
target
amount
timestamp
transaction_id
payment_mode
```

---

## Hour 8–10: L1/L2/L3 heuristics

Implement the challenge's explicit patterns.

### L1 Collector

Indicators:

```text
high incoming degree
multiple unique senders
rapid aggregation
```

The problem describes Collector Mules as high in-degree nodes receiving from multiple distinct senders.

### L2 Distributor

Indicators:

```text
high outgoing degree
multiple downstream accounts
rapid fund dispersion
```

Specifically detect the stated **3–7 downstream accounts** pattern.

### L3 Terminal

Indicators:

```text
crypto/P2P narration
payment wallet
foreign IP
Web_Emulator
Linux_Script
```

These are explicitly identified as terminal cash-out indicators.

---

# HOURS 10–12 — Risk Scoring

Build a transparent score:

```text
Mule Risk =
    Velocity Score
  + Fan-In Score
  + Fan-Out Score
  + Layer Score
  + Terminal Score
  + Device/IP Score
```

Normalize:

```text
0 ───────────────────── 100
Low                    Critical
```

Most importantly, **show why an account received its score**.

Example:

```text
Account: XXXX1234

Mule Risk: 91

Reasons:
✓ 94% funds dispersed within 7 min
✓ 12 unique incoming accounts
✓ 6 downstream accounts
✓ Foreign IP detected
✓ Web_Emulator detected
```

This makes the system much easier for judges to understand than a black-box classifier.

### Checkpoint #2

Given a known suspicious account, your engine should return:

```text
Risk score
↓
L1/L2/L3 classification
↓
Evidence
↓
Related accounts
```

---

# HOURS 12–16 — Multi-Hop Investigation Engine

This is the most important functionality for the **40% Blind Victim Query Test**.

## Hour 12–14: 4-hop traversal

Input:

```text
Victim Account ID
```

Output:

```text
Victim
  ↓
L1 Collector
  ↓
L2 Distributor
  ↓
L3 Terminal
```

Support:

```text
hop=1
hop=2
hop=3
hop=4
```

Return:

```json
{
  "victim": "...",
  "layers": [],
  "transactions": [],
  "total_amount": 0
}
```

---

## Hour 14–15: Temporal propagation

Calculate:

```text
T0 = victim transaction

T1 = first downstream transfer
T2 = next transfer
T3 = cash-out
```

Expose:

```text
transaction timestamp
amount
sender
receiver
delay
```

The challenge specifically requires minute-level playback across the 15-day transaction timeline.

---

## Hour 15–16: Performance optimization

Benchmark:

```text
10 queries
50 queries
100 queries
```

Target:

```text
<2 seconds
```

### Checkpoint #3

You should be able to take an arbitrary victim account and produce its 4-hop money trail.

---

# HOURS 16–21 — Investigation Dashboard

Now build the visual interface around the working backend.

## Hour 16–17: Main dashboard

```text
┌───────────────────────────────────────────────┐
│ VAJRA                      SYSTEM ONLINE      │
├───────────────────────────────────────────────┤
│ Victim Account [____________] [TRACE]         │
│                                               │
│ Risk: 87     Funds: ₹4.2L     Hops: 4         │
├───────────────────────────────────────────────┤
│                                               │
│             TRANSACTION GRAPH                 │
│                                               │
│       Victim                                 │
│          │                                    │
│        [L1]                                   │
│       / | \                                   │
│    [L2][L2][L2]                               │
│       \  |  /                                 │
│       [L3]                                     │
│                                               │
├───────────────────────────────────────────────┤
│ Timeline ───────●──────────────────────────── │
└───────────────────────────────────────────────┘
```

## Hour 17–19: Graph visualization

Use Cytoscape.js.

Node concept:

```text
Victim       → circle
L1 Collector → diamond
L2 Distributor → square
L3 Terminal  → triangle
Normal       → small circle
```

Node click:

```text
Account
Risk
Bank
IFSC
Incoming
Outgoing
Device
IP
```

## Hour 19–20: Timeline

Implement:

```text
15-day slider
```

When moved:

```text
show transactions
hide transactions
update graph
update totals
```

## Hour 20–21: Isolation/export

Click:

```text
ISOLATE RING
```

Then display only:

```text
Victim
+
related L1
+
related L2
+
related L3
```

Allow:

```text
Export CSV
Export JSON
```

### Checkpoint #4

A judge can enter an account → click Trace → see the money trail visually.

---

# HOURS 21–25 — Legal/AI Module

The challenge gives **20%** to court-ready output and requires a case diary plus bank freeze requisition.

## Hour 21–22: Evidence object

Before involving an LLM, create a deterministic evidence object:

```json
{
  "victim_account": "...",
  "total_siphoned": 420000,
  "layer_1": [],
  "layer_2": [],
  "layer_3": [],
  "transactions": [],
  "timestamps": [],
  "freeze_candidates": []
}
```

This becomes the **single source of truth**.

## Hour 22–23: Case Diary

Generate:

```text
CASE DIARY

Victim:
XXXX

Total funds:
₹4,20,000

Layer 1:
Account...
Timestamp...
Amount...

Layer 2:
Account...
Timestamp...
Amount...

Terminal:
Account...
Evidence...

Recommended immediate action:
...
```

---

# Hour 23–24 — Freeze Requisition

Generate structured bank output:

```text
BANK FREEZE REQUISITION

Bank:
IFSC:
Account:
Transaction ID:
Amount:
Date/Time:
Reason:
Reference:
```

The problem requires exact beneficiary account numbers, IFSCs and disputed transaction IDs.

---

# Hour 24–25 — Anti-Hallucination Layer

This is **critical**.

Never allow:

```text
LLM → invent facts
```

Instead:

```text
Database
   ↓
Evidence JSON
   ↓
Template / constrained generation
   ↓
Validation
   ↓
Final document
```

Validation:

```python
assert every_account in database
assert every_amount in transactions
assert every_transaction_id in database
```

If validation fails:

```text
GENERATE FAILED — EVIDENCE MISMATCH
```

The challenge explicitly requires the AI to be programmatically prevented from hallucinating account numbers or amounts.

### Checkpoint #5

Generate a complete case diary and freeze requisition from one investigation.

---

# HOURS 25–28 — Blind-Test Hardening

Now stop adding major features.

Create **5 hidden-style test cases**.

For each:

```text
Victim
 ↓
L1
 ↓
L2
 ↓
L3
```

Test:

| Test | Requirement |
|---|---|
| Victim search | Works |
| 4-hop trace | <2 sec |
| L1 detection | Correct |
| L2 detection | Correct |
| L3 detection | Correct |
| Graph | Correct |
| Amount | Correct |
| Timestamp | Correct |
| Case diary | Correct |
| Freeze notice | Correct |

---

# HOURS 28–31 — Performance + Reliability

## Optimize ingestion

Benchmark:

```text
2M rows
```

Target:

```text
≤60 sec
```

The official benchmark specifies 2M rows on **16 GB RAM hardware**.

## Optimize graph

Don't render the entire 2M-record graph.

Use:

```text
Victim
 ↓
Relevant subgraph
 ↓
500-ish nodes
 ↓
1500-ish edges
```

The specification explicitly expects the UI to remain responsive for subgraphs containing 500+ nodes and 1,500+ edges.

## Add failure handling

Test:

```text
invalid account
missing IFSC
duplicate transaction
empty narration
unknown payment mode
malformed IP
missing timestamp
```

---

# HOURS 31–33 — Presentation Layer

Now make the project **judge-friendly**.

## Dashboard should immediately communicate:

```text
2M+ TRANSACTIONS ANALYZED

Victim → L1 → L2 → L3

₹4.2L TRACE

Mule Risk: 91/100

4-Hop Trace: 0.8 sec

Terminal Nodes: 3

[GENERATE CASE DIARY]
[FREEZE REQUISITION]
```

Avoid filling the screen with technical information.

---

# HOURS 33–34 — Demo Rehearsal

Your demo should take approximately **3–5 minutes**.

### Demo sequence

**1. Load dataset**

> “Vajra locally processes the 2-million-record banking dataset.”

**2. Enter victim account**

```text
VICTIM: XXXXXXXX
```

**3. Trace**

```text
Victim
 ↓
Collector
 ↓
Distributor
 ↓
Terminal
```

**4. Show evidence**

```text
₹ amount
timestamps
transaction IDs
IP/device indicators
```

**5. Show risk**

```text
Mule Risk: XX/100
```

**6. Generate case diary**

**7. Generate freeze requisition**

**8. Show offline architecture**

Emphasize that core ingestion, graph computation and dashboard operation are local, as required by the specification.

---

# HOURS 34–35 — Final QA

Run the entire system from a clean environment.

```bash
./setup.sh
./load_data.sh
./start.sh
```

Verify:

- No cloud dependency
- Dataset loads
- API starts
- Frontend starts
- Search works
- Trace works
- Graph works
- Timeline works
- Export works
- Case diary works
- Freeze notice works
- No hallucinated evidence
- No crashes

---

# HOURS 35–36 — Freeze

**Do not add features.**

Use the final hour for:

```text
Git commit
↓
Backup
↓
README
↓
Architecture diagram
↓
Demo dataset
↓
Demo script
↓
Final benchmark numbers
↓
Presentation
```

Create a final benchmark table:

| Metric | Target | Your Result |
|---|---:|---:|
| 2M ingestion | ≤60 sec | ___ |
| 4-hop trace | ≤2 sec | ___ |
| Graph responsiveness | 500+ nodes | ___ |
| Mule detection | Precision/Recall | ___ |
| Local execution | Required | ✓ |
| Case Diary | Required | ✓ |
| Freeze Notice | Required | ✓ |

---

# Team Division

If you have **4 people**, divide it like this:

## Person 1 — Data + Performance

```text
Polars
DuckDB
Ingestion
Indexes
Query optimization
Benchmarks
```

## Person 2 — Detection + Graph

```text
Graph construction
L1/L2/L3 detection
Risk score
4-hop traversal
Temporal analysis
```

## Person 3 — Frontend

```text
React
Dashboard
Cytoscape
Timeline
Search
Subgraph isolation
```

## Person 4 — AI + Forensics

```text
Evidence schema
Case Diary
Freeze Requisition
AI integration
Anti-hallucination validation
Export
Demo
```

Everyone should understand the **end-to-end pipeline**, but ownership prevents four people from simultaneously editing the same components.

---

# Priority Matrix

Because the judging is weighted, use this priority order:

| Priority | Feature | Jury relevance |
|---|---|---|
| **P0** | Victim → 4-hop trace | **40% Blind Test** |
| **P0** | L1/L2/L3 detection | **30% Detection** |
| **P0** | Risk/evidence explanation | Detection |
| **P0** | Case Diary | **20% Output** |
| **P0** | Freeze Requisition | **20% Output** |
| **P1** | 2M ingestion | Engineering + required benchmark |
| **P1** | Interactive graph | Blind Test |
| **P1** | Timeline | Functional requirement |
| **P1** | Local/offline operation | Engineering requirement |
| **P2** | Fancy UI | Low |
| **P2** | Advanced AI chatbot | Low |
| **P2** | Extra ML model | Low |
| **P2** | Authentication | Low |
| **P2** | Cloud deployment | Explicitly unnecessary |

The most important strategic decision is **not to make the AI the centerpiece**. The actual core path is the deterministic forensic pipeline:

```text
2M Records
     ↓
Fast Indexing
     ↓
Victim Query
     ↓
Graph Traversal
     ↓
L1 → L2 → L3
     ↓
Evidence-backed Risk
     ↓
Interactive Graph
     ↓
Case Diary + Freeze Notice
```

## Final Rule for the 36 Hours

> **By Hour 16, you should already have a working victim → L1 → L2 → L3 trace.**

Everything after that should make the core flow **faster, more accurate, more explainable, and more polished**.
