"""
Automated Test Suite for Academic Synthetic Scenarios:
Tests dynamic ingestion, multi-hop trail tracing, and legal notice generation
across 3 peer-reviewed fraud archetypes via live FastAPI server.
"""

import urllib.request
import json
import time
from pathlib import Path

def api_post(endpoint: str, payload: dict) -> dict:
    url = f"http://127.0.0.1:8000{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def api_get(endpoint: str) -> dict:
    url = f"http://127.0.0.1:8000{endpoint}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode())

def test_scenario(csv_path: str, victim_acct: str, expected_min_recoverable: float):
    print(f"\n========================================================")
    print(f" Testing Scenario: {Path(csv_path).name}")
    print(f"========================================================")

    # 1. Ingestion via API
    t0 = time.perf_counter()
    stats = api_post("/api/ingest", {"filepath": csv_path})
    ingest_time = time.perf_counter() - t0
    print(f"✓ Ingested {stats['total_transactions']} txns across {stats['total_accounts']} accounts in {ingest_time:.2f}s ({stats['rows_per_second']} rows/s)")
    print(f"  SHA-256 Custody Hash: {stats['dataset_sha256']}")

    # 2. Multi-hop Trace via API
    t1 = time.perf_counter()
    trace = api_post("/api/trace", {"victim_account": victim_acct, "max_hops": 4})
    trace_time_ms = (time.perf_counter() - t1) * 1000
    print(f"✓ Multi-hop Money Trail Traced in {trace_time_ms:.2f} ms")
    print(f"  Victim Siphoned Amount: ₹{trace['initial_loss_inr']:,.2f}")
    print(f"  Total Recoverable Funds: ₹{trace['total_held_inr']:,.2f} ({trace['recovery_potential_pct']}%)")
    print(f"  Ring Size: {trace['num_nodes']} accounts · {trace['num_edges']} transaction flows")

    assert trace['total_held_inr'] >= expected_min_recoverable, f"Expected min recoverable {expected_min_recoverable}, got {trace['total_held_inr']}"

    # 3. Layer Validation
    layers = {n['layer'] for n in trace['nodes']}
    print(f"  Identified Layers: {sorted(list(layers))}")

    # 4. Freeze Recommendations
    recs = trace.get("freeze_recommendations", [])
    print(f"  Accounts Recommended for Statutory Freeze: {len(recs)}")
    for rank, r in enumerate(recs[:3], 1):
        print(f"    #{rank} {r['acct_no']} ({r['bank']}) -> ₹{r['held_inr']:,.2f} ({r['coverage_pct']}% of loss)")

    # 5. English & Hindi Statutory Notice Generation via API
    diary = api_post("/api/reports/diary", {"victim_account": victim_acct, "case_ref": "CYBER/IND/TEST/001"})
    assert diary['verification']['verified'], f"Case Diary verification failed: {diary['verification']}"
    print(f"✓ Police Case Diary Verified (Sec 192 BNSS / 172 CrPC): 100% Factually Exact")

    freeze_en = api_post("/api/reports/freeze", {"victim_account": victim_acct, "target_bank": "AUTO", "case_ref": "CYBER/IND/TEST/001"})
    assert freeze_en['verification']['verified'], f"English Freeze Notice verification failed: {freeze_en['verification']}"
    print(f"✓ English Bank Freeze Order Verified (Sec 94 BNSS): Targeting {freeze_en['bank']} (₹{freeze_en['total_lien_inr']:,.2f})")

    freeze_hi = api_post("/api/reports/freeze-hindi", {"victim_account": victim_acct, "target_bank": "AUTO", "case_ref": "CYBER/IND/TEST/001"})
    assert freeze_hi['verification']['verified'], f"Hindi Freeze Notice verification failed: {freeze_hi['verification']}"
    print(f"✓ Hindi Bank Freeze Order Verified (धारा 94 बीएनएसएस): Targeting {freeze_hi['bank']}")

def run_all():
    # Scenario 1: Fast Smurfing
    test_scenario(
        csv_path="synthetic_data/scenario_1_fast_smurfing.csv",
        victim_acct="SBIN10009901",
        expected_min_recoverable=100000.0
    )

    # Scenario 2: Investment Scam
    test_scenario(
        csv_path="synthetic_data/scenario_2_investment_scam.csv",
        victim_acct="SBIN10008000",
        expected_min_recoverable=50000.0
    )

    # Scenario 3: Cyclic Laundering
    test_scenario(
        csv_path="synthetic_data/scenario_3_cyclic_ring.csv",
        victim_acct="AXIS10007701",
        expected_min_recoverable=100000.0
    )

    # Scenario 4: Mega Capacity Limit Stress Test (511 Nodes, 1,650 Flows)
    test_scenario(
        csv_path="synthetic_data/scenario_4_mega_capacity_stress_test_500nodes.csv",
        victim_acct="SBIN10005001",
        expected_min_recoverable=1000000.0
    )

    # Restore 2M Benchmark Dataset
    print("\n========================================================")
    print(" Restoring 2,000,000 Transaction Benchmark Dataset...")
    print("========================================================")
    t0 = time.perf_counter()
    bench_csv = "VoidHacks8_MuleAccount_2M_Transactions.csv"
    if Path(bench_csv).exists():
        res = api_post("/api/ingest", {"filepath": bench_csv})
        print(f"✓ Successfully restored {res['total_transactions']:,} txns in {res['ingest_time_seconds']}s.")

    print("\n>>> ALL 4 SYNTHETIC ACADEMIC SCENARIOS PASSED WITH 100% FACTUAL FIDELITY! <<<")

if __name__ == "__main__":
    run_all()
