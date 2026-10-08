# ML/DL Extension — Operation “Vajra”

> **Companion document to:** `hackathon_build_plan.md`
>
> This document extends the original 36-hour plan with an ML/graph-learning layer. It does **not** replace the deterministic forensic pipeline. The ML layer is an additional scoring and verification component.

---

# 1. Where ML Fits in the Existing Plan

The original architecture remains the backbone:

```text
2M Transactions
     ↓
Fast Ingestion
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

Add ML between **feature extraction** and the final risk/evidence stage:

```text
2M Transactions
       ↓
Polars + DuckDB
       ↓
Feature Engineering
       ↓
┌─────────────────────────────┐
│                             │
│  Rule-Based Detection       │
│  Velocity / Fan-In /        │
│  Fan-Out / L1-L2-L3         │
│                             │
│  +                          │
│                             │
│  ML Risk Classifier         │
│  XGBoost / LightGBM         │
│                             │
│  +                          │
│                             │
│  Optional Graph Embeddings  │
│  Node2Vec                   │
│                             │
└──────────────┬──────────────┘
               ↓
       Ensemble Risk Score
             0–100
               ↓
       Evidence Validation
               ↓
       Graph + Case Outputs
```

## Important Design Principle

The ML model should **assist the investigation**, not replace the deterministic evidence pipeline.

The system should never treat:

```text
ML says mule
```

as equivalent to:

```text
Mule confirmed
```

Instead, combine:

```text
ML prediction
+
graph topology
+
transaction behavior
+
explicit L1/L2/L3 indicators
+
database evidence
```

to produce an explainable risk score.

---

# 2. Model 1 — XGBoost / LightGBM Mule Risk Classifier

## Role

Use a fast tabular ML model to classify suspicious accounts based on transaction-behavior features.

### Recommended choice

**XGBoost** is the default choice for the hackathon.

Alternative:

```text
LightGBM
```

Use only one. Do not waste hackathon time implementing both.

---

# 3. Feature Engineering

Create one feature vector per account.

```text
Account
   ↓
Transaction History
   ↓
Behavioral Features
   ↓
ML Feature Vector
```

## Core Features

```text
incoming_count
outgoing_count

unique_senders
unique_receivers

total_incoming
total_outgoing

avg_transaction_amount
median_transaction_amount

pass_through_ratio

median_in_out_delay

fan_in
fan_out

downstream_3_to_7_ratio

foreign_ip_ratio
emulator_ratio

crypto_narration_score

upi_ratio
imps_ratio
neft_ratio
rtgs_ratio
```

---

# 4. Feature Groups

## A. Transaction Volume

```text
incoming_count
outgoing_count
total_incoming
total_outgoing
```

These describe the overall transaction activity of an account.

---

## B. Fan-In / Fan-Out

```text
unique_senders
unique_receivers
fan_in
fan_out
```

Useful for detecting the topology described in the problem statement:

```text
Collector Mule
      ↑
  many senders

Distributor Mule
      ↓
many receivers
```

---

## C. Pass-Through Behavior

Calculate:

```text
pass_through_ratio =
amount_dispersed_soon_after_receipt
/
total_incoming
```

The problem statement specifically identifies accounts where **≥90% of incoming funds are dispersed within 3–15 minutes** as high-velocity pass-through candidates.

This feature should therefore be a high-priority feature in the ML dataset.

---

## D. Timing Features

Calculate:

```text
median_in_out_delay
minimum_in_out_delay
maximum_in_out_delay
rapid_transfer_ratio
```

Example:

```text
Incoming:
10:00:02

Outgoing:
10:04:31

Delay:
4m 29s
```

---

## E. Downstream Structure

Calculate:

```text
number_of_downstream_accounts
downstream_3_to_7_ratio
```

This captures the specified distributor pattern.

---

## F. IP / Device Features

```text
foreign_ip_ratio
web_emulator_ratio
linux_script_ratio
```

The challenge explicitly identifies foreign IP anomalies and `Web_Emulator` / `Linux_Script` device profiles as terminal cash-out indicators.

---

## G. Narration Features

Create a simple deterministic narration score:

```text
crypto_narration_score
wallet_narration_score
cashout_marker_score
scam_marker_score
```

Do **not** initially use a large NLP model.

For a 36-hour hackathon, a controlled keyword/marker extractor is faster and more explainable.

---

# 5. Training Data

The problem statement specifies:

```text
1,500 ground-truth injected mule accounts
23,500 regular accounts
```

during evaluation.

Use available labeled data if the provided dataset exposes these labels.

If labels are available:

```text
Mule       = 1
Regular    = 0
```

If labels are not provided for training, do **not** invent ground-truth labels.

Instead use:

```text
Rule-generated candidates
+
known injected examples if supplied
```

and clearly distinguish heuristic/pseudo-label training from actual ground-truth evaluation.

---

# 6. Training Pipeline

```text
Raw Transactions
       ↓
Account Aggregation
       ↓
Feature Engineering
       ↓
Train / Validation Split
       ↓
XGBoost
       ↓
Probability
       ↓
Threshold
       ↓
Mule / Non-Mule
```

Example output:

```text
Account: XXXX1234

ML Mule Probability: 0.94

Classification:
SUSPICIOUS
```

---

# 7. Model Evaluation

Track:

```text
Precision
Recall
F1-score
ROC-AUC
Confusion Matrix
```

For this challenge, pay particular attention to:

```text
False Positives
False Negatives
```

because the judging explicitly evaluates detection precision/recall.

Do not report an impressive metric unless it is measured against an appropriate labeled evaluation set.

---

# 8. Explainability

The model should expose its strongest contributing features.

Example:

```text
Account: XXXX1234

ML Probability: 0.94

Top contributing indicators:

1. Pass-through ratio       0.97
2. Rapid transfer ratio     0.91
3. Fan-out                   0.86
4. Foreign IP ratio          0.72
5. Emulator ratio            0.68
```

For the UI, show this as:

```text
WHY THIS ACCOUNT IS SUSPICIOUS

██████████████████  Pass-through
████████████████    Rapid transfers
██████████████      Fan-out
███████████         Foreign IP
█████████           Emulator
```

This is much more useful to an investigator than simply displaying:

```text
Risk = 94
```

---

# 9. Model 2 — Node2Vec Graph Embeddings

## Purpose

Node2Vec can capture the **structural position of accounts within the transaction graph**.

This is optional.

The recommended order is:

```text
XGBoost
   ↓
Working
   ↓
Node2Vec
   ↓
Working
   ↓
Optional integration
```

Do not start with Node2Vec.

---

# 10. Node2Vec Pipeline

```text
Transaction Graph
       ↓
Account Nodes
       ↓
Transaction Edges
       ↓
Node2Vec
       ↓
Account Embedding
       ↓
Concatenate with Behavioral Features
       ↓
XGBoost
```

Example:

```text
Account A → [0.12, -0.41, 0.88, ...]
Account B → [0.19, -0.36, 0.81, ...]
```

The embedding represents the account's graph neighborhood and structural role.

---

# 11. Combined ML Model

If Node2Vec is implemented successfully:

```text
                 Account
                    │
          ┌─────────┴─────────┐
          │                   │
    Behavioral Features   Node2Vec
          │                   │
          │               Embedding
          │                   │
          └─────────┬─────────┘
                    ↓
                 XGBoost
                    ↓
            Mule Probability
```

Feature vector:

```text
[
  behavioral_features,
  node2vec_embedding
]
```

---

# 12. Final Ensemble Risk Score

The final system should combine the ML prediction with deterministic evidence.

One practical structure:

```text
Rule Score
      +
ML Score
      +
Graph Evidence
      ↓
Final Risk Score
```

For example:

```text
Rule Score:       88
ML Probability:   0.94
Graph Evidence:   Strong
```

Then normalize into:

```text
Mule Risk: 92/100
```

The exact weighting should be calibrated experimentally rather than arbitrarily claimed to be optimal.

---

# 13. Suggested Risk Architecture

```text
                    Account
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
     Rule Engine    XGBoost     Graph Features
          │            │            │
          │            ▼            │
          │       ML Probability    │
          │                         │
          └────────────┬────────────┘
                       ▼
                Risk Aggregator
                       │
                       ▼
                 0–100 Risk
                       │
             ┌─────────┴─────────┐
             │                   │
        L1/L2/L3 Evidence     Explanation
```

---

# 14. Keep L1/L2/L3 Deterministic

Do not make the ML model responsible for deciding the final layer.

Use explicit graph rules:

## L1 — Collector

```text
High in-degree
+
Multiple distinct senders
+
Rapid aggregation
```

## L2 — Distributor

```text
High out-degree
+
3–7 downstream accounts
+
Rapid dispersion
```

## L3 — Terminal

```text
Wallet / crypto indicators
+
Foreign IP anomalies
+
Web_Emulator / Linux_Script
+
Cash-out behavior
```

Then let ML provide:

```text
How suspicious is this account?
```

while graph logic provides:

```text
What role does this account play?
```

This creates a much clearer architecture.

---

# 15. Updated System Architecture

The previous `.md` architecture can now be extended to:

```text
┌─────────────────────────────────────────────────────────────┐
│                    TRANSACTION DATA                         │
│                     2M+ Records                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 INGESTION + NORMALIZATION                   │
│                  Polars + DuckDB                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FEATURE ENGINE                            │
│  Velocity • Fan-In • Fan-Out • Timing • IP • Device        │
│  Narration • Payment Mode • Graph Statistics                │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               ▼                      ▼
      ┌────────────────┐      ┌──────────────────┐
      │ RULE ENGINE    │      │  ML ENGINE        │
      │                │      │                  │
      │ L1/L2/L3       │      │ XGBoost           │
      │ Detection      │      │ + Optional        │
      │                │      │ Node2Vec          │
      └────────┬───────┘      └────────┬─────────┘
               │                       │
               └───────────┬───────────┘
                           ▼
                  ┌─────────────────┐
                  │ RISK AGGREGATOR │
                  │    0–100        │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ 4-HOP TRACE     │
                  │ Victim → L1     │
                  │ → L2 → L3       │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          Graph UI     Evidence     AI Reports
                       Object       Case Diary
                                    Freeze Notice
```

---

# 16. Where to Add This to the 36-Hour Timeline

Do not create a separate 10-hour ML phase.

Integrate it into the existing schedule.

| Original Time | Existing Work | ML Addition |
|---|---|---|
| 0–3 | Architecture | Finalize ML interface |
| 3–7 | Data Engine | Build account feature tables |
| 7–12 | Detection | **Train XGBoost** |
| 10–12 | Risk Scoring | **ML probability + explanations** |
| 12–16 | Multi-hop Trace | Use ML score in investigation |
| 16–21 | Dashboard | Add ML score + feature explanation |
| 21–25 | AI/Legal | Include ML evidence in case narrative |
| 25–28 | Blind Testing | Evaluate precision/recall |
| 28–31 | Performance | Optimize inference |
| 31–36 | Demo/QA | Demonstrate ML + deterministic evidence |

---

# 17. Practical 36-Hour ML Schedule

## Hours 7–8

Create account-level feature extraction.

```text
transactions
   ↓
group by account
   ↓
behavioral features
```

## Hours 8–9

Create labels/evaluation data if the dataset provides valid labels.

## Hours 9–10

Train XGBoost.

```text
features
 ↓
XGBoost
 ↓
probability
```

## Hours 10–11

Evaluate:

```text
precision
recall
F1
confusion matrix
```

## Hour 11–12

Integrate:

```text
ML probability
+
rule score
```

into the risk engine.

### ML Checkpoint

You should be able to query:

```text
Account
↓
ML probability
↓
Risk score
↓
Reasons
```

---

# 18. Optional Node2Vec Schedule

Only begin after XGBoost works.

## Hours 12–13

Generate transaction graph.

## Hours 13–14

Train Node2Vec embeddings.

## Hours 14–15

Concatenate:

```text
behavioral features
+
Node2Vec
```

## Hours 15–16

Retrain XGBoost and benchmark.

If Node2Vec does not produce a measurable improvement or creates performance problems:

> **Remove it.**

The hackathon does not reward the number of models. It rewards working detection, traceability, accuracy, and engineering.

---

# 19. What NOT to Build

Avoid these during the 36-hour event unless the core system is already finished:

```text
❌ Large Transformer trained from scratch
❌ LSTM on every transaction
❌ Full GNN architecture
❌ Graph Transformer
❌ Complex NLP model
❌ Multi-model ensemble with 5+ models
❌ Cloud ML infrastructure
❌ Real-time distributed training
```

The dataset is fundamentally structured around **transactions + graph topology + behavioral indicators**, making a fast tabular model much more practical for this build.

---

# 20. Final ML Demonstration

During the demo, show:

```text
Victim Account
      ↓
Trace
      ↓
L1 Collector
      ↓
L2 Distributor
      ↓
L3 Terminal
```

Click an account:

```text
┌──────────────────────────────┐
│ Account: XXXX1234            │
│                              │
│ Mule Risk: 92/100            │
│ ML Probability: 0.94         │
│ Layer: L2 Distributor        │
│                              │
│ Evidence                     │
│ • 14 unique receivers        │
│ • 96% rapid fund dispersion  │
│ • 6 downstream accounts      │
│ • 4m median transfer delay   │
│ • Emulator activity          │
└──────────────────────────────┘
```

Then:

```text
[GENERATE CASE DIARY]
[GENERATE FREEZE REQUISITION]
```

---

# 21. Final Recommended Model Stack

## Mandatory

```text
XGBoost
```

Use it for:

```text
Account-level mule probability
```

## Optional

```text
Node2Vec
```

Use it for:

```text
Graph structural embeddings
```

## Avoid

```text
Full GNN
Deep LSTM
Transformer
```

unless the rest of the system is already stable.

---

# 22. Final Architecture Philosophy

The strongest version of the project is **not**:

```text
AI detects everything
```

It is:

```text
                FAST DATA ENGINE
                      │
                      ▼
             GRAPH + RULE ENGINE
                      │
                L1 / L2 / L3
                      │
                      ├──────────────┐
                      ▼              ▼
                  XGBoost         Node2Vec*
                      │              │
                      └──────┬───────┘
                             ▼
                       RISK SCORE
                             │
                             ▼
                     HUMAN-READABLE
                        EVIDENCE
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
           INVESTIGATION UI        LEGAL OUTPUT
```

`*` Optional.

The **rules and graph provide evidence**, while **ML adds behavioral intelligence and prioritization**.

That keeps the solution explainable, fast, locally deployable, and aligned with the challenge's core requirements.
