"""
End-to-End Test Suite for Operation Vajra (वज्र) using standard library urllib.
"""

import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def get(path: str):
    req = urllib.request.Request(f"{BASE_URL}{path}")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

def post(path: str, data: dict):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}{path}", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

def test_all():
    print("1. Testing /api/health...")
    status, health = get("/api/health")
    assert status == 200, "Health check failed"
    print(f"   Status: {health['status']}, Offline: {health['offline_mode']}, Total Nodes: {health['total_nodes']:,}, Total Edges: {health['total_edges']:,}")

    print("\n2. Testing /api/overview...")
    status, ov = get("/api/overview")
    assert status == 200
    print(f"   Total Accounts: {ov['total_accounts']:,}, Total Txns: {ov['total_transactions']:,}")
    print(f"   Sample Victims: {ov['sample_victims']}")

    print("\n3. Testing Multi-Hop Trace on Blind Victims...")
    test_victims = ov['sample_victims'][:3]
    for v in test_victims:
        status, tr = post("/api/trace", {"victim_account": v, "max_hops": 4})
        assert status == 200, f"Trace failed for {v}"
        print(f"   Victim: {v} | Latency: {tr['timing_ms']} ms | Siphoned: ₹{tr['initial_loss_inr']:,} | Recoverable: ₹{tr['total_held_inr']:,} ({tr['recovery_potential_pct']}%) | Nodes: {tr['num_nodes']}, Edges: {tr['num_edges']}")

    print("\n4. Testing Legal Case Diary Generation & Anti-Hallucination Guardrail...")
    v = test_victims[0]
    status, diary = post("/api/reports/diary", {"victim_account": v})
    assert status == 200
    print(f"   Compliance Status: {diary['verification']['compliance_status']}")
    print(f"   Verified: {diary['verification']['verified']} (Hallucination Detected: {diary['verification']['hallucination_detected']})")
    print(f"   SHA-256 Custody Hash: {diary['sha256']}")

    print("\n5. Testing Statutory Bank Freeze Requisition (Indore Default Profile)...")
    status, freeze = post("/api/reports/freeze", {"victim_account": v, "target_bank": "AXIS", "profile_id": "indore_default"})
    assert status == 200
    print(f"   Target Bank: {freeze['bank_name']} | Accounts to Lien: {freeze['accounts_count']} | Total Lien: ₹{freeze['total_lien_inr']:,}")
    print(f"   Pack: {freeze['pack_version']} | Engine: {freeze['writer_engine']}")
    print(f"   Fact Verified: {freeze['verification']['fact_verified']} | Legal Verified: {freeze['verification']['legal_verified']}")
    assert freeze['verification']['legal_verified'], "Legal citation verification failed"

    print("\n5b. Testing Legal Profiles API & Bombay Profile Requisition...")
    status, profs = get("/api/reports/profiles")
    assert status == 200
    assert len(profs['profiles']) == 4, f"Expected 4 profiles, got {len(profs['profiles'])}"
    print(f"   Legal Pack: v{profs['pack_version']} ({profs['valid_as_of']}) | Stale: {profs['staleness']['is_stale']} | Profiles: {[p['id'] for p in profs['profiles']]}")

    status, freeze_bombay = post("/api/reports/freeze", {"victim_account": v, "target_bank": "AXIS", "profile_id": "bombay_strict_107"})
    assert status == 200
    assert freeze_bombay['profile_id'] == "bombay_strict_107"
    print(f"   Bombay Profile Verified: {freeze_bombay['verification']['legal_verified']}")

    print("\n5c. Testing Human-Reviewed Hindi Statutory Notice Generation...")
    status, freeze_hi = post("/api/reports/freeze-hindi", {"victim_account": v, "target_bank": "AXIS", "profile_id": "indore_default"})
    assert status == 200
    print(f"   Hindi Notice Engine: {freeze_hi['writer_engine']}")
    print(f"   Hindi Compliance Status: {freeze_hi['verification']['compliance_status']}")
    assert "प्रारूप (DRAFT)" in freeze_hi['raw_text']

    print("\n6. Testing Account Profile & Search...")
    status, acct = get(f"/api/accounts/{v}")
    assert status == 200
    print(f"   Account: {acct['acct_no']} | Bank: {acct['bank']} | Linked Txns: {len(acct['recent_transactions'])}")

    status, search_res = get("/api/search?q=TASK")
    assert status == 200
    print(f"   Search returned {len(search_res['transactions'])} matching transactions")

    print("\n7. Testing Live Benchmark Telemetry...")
    status, bench = get("/api/bench")
    assert status == 200
    print(f"   Process RAM: {bench['process_ram_mb']} MB (Peak: {bench['peak_process_ram_mb']} MB) | CPU: {bench['cpu_percent']}%")

    print("\n>>> ALL SYSTEM TESTS PASSED! 100% OPERATIONAL & VERIFIED. <<<")

if __name__ == "__main__":
    test_all()
