"""
Ingestion Test & Benchmark Script for VoidHacks8_MuleAccount_2M_Transactions.csv.
"""

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.ingest.loader import ingest_engine

def progress(phase: str, rows: int, rate: float, ram: float):
    print(f"[{phase}] Rows: {rows:,} | Rate: {rate:,.0f} rows/s | RAM: {ram:.1f} MB")

if __name__ == "__main__":
    csv_file = "VoidHacks8_MuleAccount_2M_Transactions.csv"
    print(f"Starting Ingestion Benchmark on {csv_file}...")
    stats = ingest_engine.ingest_csv(csv_file, progress_callback=progress)
    print("\n--- INGESTION BENCHMARK RESULTS ---")
    for k, v in stats.items():
        print(f"  {k}: {v}")
