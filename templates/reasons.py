"""
Vajra Templates Engine - Deterministic Forensic Reason Generation.
Produces court-admissible audit explanations without LLMs or free-form text.
"""


RULE_TEMPLATES: dict[str, str] = {
    # Velocity Family
    "PTR_15M": "{pct:.0f}% of money received was sent out within 15 minutes (higher than {pop_pct:.1f}% of accounts)",
    "PTR_1H": "{pct:.0f}% of money received was drained within 1 hour (higher than {pop_pct:.1f}% of accounts)",
    "PTR_24H": "{pct:.0f}% of money received was drained within 24 hours (higher than {pop_pct:.1f}% of accounts)",
    "HOLD_FAST": "90% of received funds drained within {val:.0f} seconds of arrival",
    "HOLD_MEDIAN": "Median fund retention time is under {val:.0f} seconds",

    # Fan Topology Family
    "FAN_OUT": "High dispersion: {val} outgoing counter-parties within rapid disbursement window",
    "FAN_IN": "Fan-in aggregation: {val} distinct senders consolidated into single account within 1 hour",
    "SPLIT_EQUAL": "Structuring motif: {val} equal outgoing transfers (CV {cv:.2f})",

    # Cash-Out Family
    "CASHOUT_FOREIGN": "High foreign IP cash-out ratio ({pct:.0f}% of outbound transfers)",
    "CASHOUT_HEADLESS": "Automated headless browser cash-out ({pct:.0f}% of outbound transfers)",
    "CASHOUT_CRYPTO": "Direct crypto exchange / P2P payment drainage ({pct:.0f}% of outflows)",

    # Device & Network Family
    "SHARED_DEVICE": "Device fingerprint shared across {val} distinct account holders",
    "SHARED_IP": "Network IP address shared with {val} distinct account holders",

    # Narration & Burst
    "NARRATION_RISK": "Transactions contain high-risk laundering keywords ({val} flagged transfers)",
    "NIGHT_BURST": "Abnormal off-hours burst activity ({pct:.0f}% during 00:00-06:00)",

    # Chain Coherence
    "CHAIN_COHERENT": "Directly linked to known suspicious money trail within {hops} hops ({upstream} upstream, {downstream} downstream)",

    # Ring Points
    "RING_TOPOLOGY": "Identified as intermediary bridge node between high-risk anchor accounts ({val:.1f} ring boost)",

    # Negative Reductions (Legitimate Profiles)
    "NEG_SALARY": "Legitimate periodic salary-like pattern reduced risk score by {pts:.1f} pts",
    "NEG_MERCHANT": "Merchant-like high-volume retail profile reduced risk score by {pts:.1f} pts",
    "NEG_LONG_HOLD": "Long fund retention (median hold > 24h) reduced risk score by {pts:.1f} pts",
}

# Direction-aware ML feature explanations: (Positive contribution, Negative contribution)
ML_FEATURE_TEMPLATES: dict[str, tuple[str, str]] = {
    "ptr_15m": (
        "Supervised ML identified rapid 15-minute pass-through velocity as strong mule indicator",
        "Moderate short-term pass-through reduced suspicion in ML model"
    ),
    "ptr_1h": (
        "High 1-hour fund drainage velocity elevated ML risk probability",
        "Sustained 1-hour capital retention lowered ML risk probability"
    ),
    "hold_p90_sec": (
        "Short 90th percentile hold duration indicates immediate forwarding",
        "Prolonged fund retention duration indicates non-mule behavior"
    ),
    "hold_median_sec": (
        "Ultra-short median dwell time strongly correlates with syndicate layering",
        "Extended median dwell time indicates genuine capital holding"
    ),
    "max_fan_out_15m": (
        "High rapid recipient dispersion matches distributor mule profile",
        "Single-counterparty or low-fanout structure consistent with normal banking"
    ),
    "max_fan_in_1h": (
        "High sender consolidation within 1 hour matches collector mule profile",
        "Gradual, distributed inflows consistent with legitimate personal account"
    ),
    "split_amount_cv": (
        "Low variance in outbound transfer amounts indicates deliberate structuring",
        "Natural amount variance across transfers"
    ),
    "cashout_foreign_share": (
        "Egress transfers routed through foreign IP addresses",
        "Strictly domestic transaction origination"
    ),
    "cashout_crypto_share": (
        "High volume funneled into crypto and P2P off-ramps",
        "Standard interbank clearing without crypto gateway routing"
    ),
    "cashout_headless_share": (
        "Automated headless programmatic scripts used for transfer execution",
        "Standard interactive banking client fingerprints"
    ),
    "device_sharing_count": (
        "Hardware device shared across multiple distinct beneficiary accounts",
        "Exclusive single-user device fingerprint"
    ),
    "ip_sharing_count": (
        "Network IP address shared across high number of unrelated accounts",
        "Standard residential or dedicated corporate IP address"
    ),
    "fano_burstiness": (
        "Clustered temporal bursts deviate from typical individual spending",
        "Uniform temporal spacing across transactions"
    ),
    "night_share": (
        "High concentration of off-hours operations during nocturnal window",
        "Standard business-hours activity distribution"
    ),
}
