"""
Test dynamic dataset ingestion with different column headers.
"""

import urllib.request
import json
import csv
from pathlib import Path

# Use sample custom export CSV with non-standard column headers
sample_file = "synthetic_data/sample_custom_export.csv"

with open(sample_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Reference_Number", "from_account", "to_account", "remitter_ifsc", "beneficiary_ifsc",
        "Txn_Amount", "DateTime", "channel", "remarks", "client_ip", "user_agent_type"
    ])
    for i in range(1, 21):
        writer.writerow([
            f"REF{10000+i}", f"10000000{10+i}", f"20000000{20+i}", "SBIN0001234", "HDFC0005678",
            50000.0 + i * 100, f"2026-09-25 10:{i:02d}:00", "IMPS", f"UPI/WALLET_LOAD/P2P_CRYPTO_{i}",
            "185.22.55.10", "Web_Emulator"
        ])

print(f"Created sample custom CSV: {sample_file}")

# Test dynamic ingestion via /api/ingest
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/ingest",
    data=json.dumps({"filepath": sample_file}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print("\nDynamic Ingest Result:")
    print(json.dumps(data, indent=2))

# Verify Overview now shows the new dynamic dataset!
with urllib.request.urlopen("http://127.0.0.1:8000/api/overview") as resp:
    ov = json.loads(resp.read().decode())
    print("\nUpdated Overview Response:")
    print(f"  Active Dataset: {ov.get('dataset_name')}")
    print(f"  Total Transactions: {ov.get('total_transactions')}")
    print(f"  Total Accounts: {ov.get('total_accounts')}")
    print(f"  SHA-256: {ov.get('dataset_sha256')}")

# Now reload the main 2M dataset to leave the system in production state
print("\nRestoring VoidHacks 2M benchmark dataset...")
req_restore = urllib.request.Request(
    "http://127.0.0.1:8000/api/ingest",
    data=json.dumps({"filepath": "VoidHacks8_MuleAccount_2M_Transactions.csv"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req_restore) as resp:
    res = json.loads(resp.read().decode())
    print(f"Restored {res['total_transactions']:,} transactions in {res['ingest_time_seconds']}s.")
