"""
Test Case Diary and Bank Freeze Requisition Generation and Verification.
"""

import sys
import duckdb
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.graph.csr import csr_graph
from backend.app.reports.legal_generator import legal_generator

if __name__ == "__main__":
    conn = duckdb.connect("data/duckdb/vajra.duckdb")
    csr_graph.build_from_duckdb(conn)

    victim = "AIRP10000024"
    trace_data = csr_graph.trace_victim(victim)

    # 1. Generate Case Diary
    diary = legal_generator.generate_case_diary(trace_data)
    print("\n--- GENERATED CASE DIARY ---")
    print(diary["raw_text"][:1200] + "\n... [TRUNCATED] ...")
    print(f"\nVerification: {diary['verification']}")
    print(f"Document SHA-256: {diary['sha256']}")

    # 2. Generate Bank Freeze for AXIS
    freeze = legal_generator.generate_bank_freeze_notice(trace_data, "AXIS")
    print("\n--- GENERATED BANK FREEZE REQUISITION (AXIS BANK) ---")
    print(freeze["raw_text"])
    print(f"\nVerification: {freeze['verification']}")
