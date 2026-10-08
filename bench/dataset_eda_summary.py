"""
EDA on Ingested DuckDB Data to inspect narrations, potential victims, and mule rings.
"""

import duckdb

conn = duckdb.connect("data/duckdb/vajra.duckdb")

print("--- TOP NARRATION PATTERNS ---")
print(conn.execute("""
    SELECT narration, count(*) as cnt 
    FROM txns 
    WHERE narration LIKE '%TASK%' 
       OR narration LIKE '%CRYPTO%' 
       OR narration LIKE '%WALLET%' 
       OR narration LIKE '%SETTLEMENT%' 
       OR narration LIKE '%REFUND%'
    GROUP BY narration 
    ORDER BY cnt DESC 
    LIMIT 15;
""").df())

print("\n--- HIGH FAN-OUT DISTRIBUTORS (L2 Candidates: 3 to 7 receivers in short bursts) ---")
print(conn.execute("""
    SELECT 
        src_acct, 
        count(DISTINCT dst_acct) as distinct_receivers,
        count(*) as total_out_txns,
        round(sum(amount), 2) as total_out_inr
    FROM txns
    GROUP BY src_acct
    HAVING count(DISTINCT dst_acct) BETWEEN 3 AND 15
    ORDER BY total_out_txns DESC
    LIMIT 10;
""").df())

print("\n--- SAMPLE HIGH IN-FLOW COLLECTORS (L1 Candidates) ---")
print(conn.execute("""
    SELECT 
        dst_acct,
        count(DISTINCT src_acct) as distinct_senders,
        count(*) as total_in_txns,
        round(sum(amount), 2) as total_in_inr
    FROM txns
    GROUP BY dst_acct
    ORDER BY distinct_senders DESC
    LIMIT 10;
""").df())

print("\n--- SAMPLE VICTIMS (accounts sending to L1 with scam/task refund narration) ---")
print(conn.execute("""
    SELECT 
        src_acct as victim_acct, 
        dst_acct as collector_acct, 
        amount, 
        ts, 
        narration 
    FROM txns 
    WHERE narration LIKE '%TASK_EARNING%' OR narration LIKE '%INVESTMENT%'
    LIMIT 10;
""").df())
