"""
Test CSR Graph build and trace on sample victim.
"""

import sys
import duckdb
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.graph.csr import csr_graph

if __name__ == "__main__":
    conn = duckdb.connect("data/duckdb/vajra.duckdb")
    print("Building/loading CSR graph...")
    csr_graph.build_from_duckdb(conn)

    # Let's test on victim AIRP10000024
    test_victim = "AIRP10000024"
    print(f"\nTracing victim {test_victim}...")
    res = csr_graph.trace_victim(test_victim, max_hops=4)

    print(f"\n--- TRACE RESULTS FOR {test_victim} ---")
    print(f"Timing: {res.get('timing_ms')} ms")
    print(f"Initial Victim Loss: ₹{res.get('initial_loss_inr'):,}")
    print(f"Total Recoverable (Held): ₹{res.get('total_held_inr'):,} ({res.get('recovery_potential_pct')}%)")
    print(f"Total Cashed Out: ₹{res.get('total_cashed_out_inr'):,}")
    print(f"Nodes found: {res.get('num_nodes')}, Edges found: {res.get('num_edges')}")
    
    print("\nLayer Distribution:")
    layers = {}
    for n in res.get("nodes", []):
        ly = n["layer"]
        layers[ly] = layers.get(ly, 0) + 1
    for ly, count in layers.items():
        print(f"  {ly}: {count} accounts")

    print("\nTop Freeze Recommendations:")
    for rec in res.get("freeze_recommendations", [])[:5]:
        print(f"  Account: {rec['acct_no']} | Bank: {rec['bank']} | Held: ₹{rec['held_inr']:,} | Coverage: {rec['coverage_pct']}% | Layer: {rec['layer']}")
