"""
Legal Document Generator: Police Case Diary & Bank Freeze Requisitions.
Enforces the 2 October 2026 Legal Architecture:
- Law comes exclusively from the reviewed Legal Pack (config/legal_pack.yaml).
- Ollama acts as a WRITER, not the source of law.
- Legal-citation verifier rejects any unauthorized section citations.
- AST verifier guarantees 0% entity hallucination against the graph database.
- Implements Archana v State of MP (July 2026) guidelines: amount-limited lien,
  Magistrate intimation, and 15/90 day grievance redressal timelines.
"""

import datetime
import hashlib
from typing import Dict, Any, List, Optional

from backend.app.ai.anti_hallucination import anti_hallucination_verifier
from backend.app.core.config import config
from backend.app.reports.legal_pack import legal_pack
from backend.app.reports.ollama_writer import draft_notice_with_ollama

def format_inr(paise: int) -> str:
    """Format paise to Indian Rupee format ₹X,XX,XXX.XX"""
    rupees = paise / 100.0
    s = f"{rupees:,.2f}"
    return f"₹{s}"

def format_epoch(epoch_sec: int) -> str:
    if not epoch_sec:
        return "N/A"
    return datetime.datetime.fromtimestamp(epoch_sec).strftime("%Y-%m-%d %H:%M:%S IST")

class LegalReportGenerator:
    def __init__(self):
        self.banks_map = config.banks

    def generate_case_diary(
        self,
        trace_data: Dict[str, Any],
        case_ref: str = "CYBER/IND/2026/0891",
        officer_name: str = "Inspector R. S. Bhadoria",
        officer_designation: str = "Investigating Officer, Cyber Crime Branch Indore"
    ) -> Dict[str, Any]:
        """
        Generate structured Case Diary with layer-wise chronological narrative.
        """
        victim_acct = trace_data["victim_account"]
        loss_inr = trace_data["initial_loss_inr"]
        held_inr = trace_data["total_held_inr"]
        recovery_pct = trace_data["recovery_potential_pct"]
        timestamp_now = datetime.datetime.now().strftime("%d-%b-%Y %H:%M:%S IST")

        # Group nodes by layer
        l1_nodes = [n for n in trace_data.get("nodes", []) if n.get("layer") == "L1_Collector"]
        l2_nodes = [n for n in trace_data.get("nodes", []) if n.get("layer") == "L2_Distributor"]
        l3_nodes = [n for n in trace_data.get("nodes", []) if n.get("layer") == "L3_Terminal"]

        sorted_edges = sorted(trace_data.get("edges", []), key=lambda e: e.get("ts_epoch", 0))

        lines = []
        lines.append("=" * 80)
        lines.append("DRAFT — TO BE REVIEWED AND SIGNED BY THE COMPETENT INVESTIGATING OFFICER")
        lines.append("POLICE CASE DIARY (DIGITAL FORENSICS TRAIL REPORT)")
        lines.append("POLICE COMMISSIONERATE INDORE — CYBER CRIME CELL")
        lines.append("Under Section 172 CrPC / Section 192 Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023")
        lines.append("=" * 80)
        lines.append(f"Case Reference     : {case_ref}")
        lines.append(f"Date & Time        : {timestamp_now}")
        lines.append(f"Investigating Unit : State Cyber Crime Branch, Indore (M.P.)")
        lines.append(f"Investigating Off. : {officer_name}, {officer_designation}")
        lines.append(f"Primary Victim A/C : {victim_acct}")
        lines.append(f"Total Defrauded    : ₹{loss_inr:,.2f}")
        lines.append(f"Tracked Recoverable: ₹{held_inr:,.2f} ({recovery_pct}% recovery potential)")
        lines.append("-" * 80)
        lines.append("\n1. EXECUTIVE SUMMARY & FORENSIC DISCOVERY:")
        lines.append(
            f"During the algorithmic tracing of financial cyber fraud on victim account {victim_acct}, "
            f"an automated time-respecting multi-hop analysis was executed across four layering hops. "
            f"The stolen sum of ₹{loss_inr:,.2f} was siphoned through a multi-tier money mule network consisting of "
            f"{len(l1_nodes)} Layer-1 Collector mule(s), {len(l2_nodes)} Layer-2 Distributor mule(s), and {len(l3_nodes)} Layer-3 Terminal accounts. "
            f"A total of ₹{held_inr:,.2f} remains actively immobilized/held across beneficiary accounts suitable for immediate statutory lien marking."
        )

        lines.append("\n2. LAYER-BY-LAYER SYNDICATE STRUCTURE:")
        lines.append("  [A] Layer 1 - Collector Mules (Direct Victim Inflow):")
        for n in l1_nodes:
            lines.append(f"      - Account: {n['acct_no']} | Bank: {n['bank']} | Taint In: {format_inr(n['taint_in_paise'])} | Currently Held: {format_inr(n['held_paise'])}")

        lines.append("  [B] Layer 2 - Distributor Mules (Rapid Dispersion & Smurfing):")
        for n in l2_nodes:
            lines.append(f"      - Account: {n['acct_no']} | Bank: {n['bank']} | Taint In: {format_inr(n['taint_in_paise'])} | Currently Held: {format_inr(n['held_paise'])}")

        lines.append("  [C] Layer 3 - Terminal Cash-Out Mules:")
        for n in l3_nodes:
            lines.append(f"      - Account: {n['acct_no']} | Bank: {n['bank']} | Taint In: {format_inr(n['taint_in_paise'])} | Currently Held: {format_inr(n['held_paise'])}")

        lines.append("\n3. CHRONOLOGICAL TRANSACTION TRAIL (MACHINE-AUDITED):")
        for idx, e in enumerate(sorted_edges, 1):
            lines.append(
                f"  [{idx:02d}] TXN ID: {e['txn_id']} | Time: {format_epoch(e['ts_epoch'])} | "
                f"From: {e['src_acct']} -> To: {e['dst_acct']} | Amount: {format_inr(e['amount_paise'])} | "
                f"Mode: {e['payment_mode']} | Narration: {e['narration'][:30]}"
            )

        lines.append("\n4. STATUTORY LIEN RECOMMENDATIONS (OPTIMIZED):")
        for rank, f in enumerate(trace_data.get("freeze_recommendations", []), 1):
            lines.append(
                f"  Rank #{rank}: Account: {f['acct_no']} | Bank: {f['bank']} | "
                f"Lien Amount: ₹{f['held_inr']:,.2f} | Coverage: {f['coverage_pct']}% of Loss"
            )

        lines.append("\n" + "=" * 80)
        lines.append("ELECTRONIC EVIDENCE INTEGRITY CERTIFICATE (SEC. 63 BSA / SEC. 65B IEA)")
        lines.append("This document was generated automatically by Vajra analytics workbench.")
        raw_text = "\n".join(lines)

        allowed_citations = ["192 BNSS", "172 CRPC", "63 BSA", "65B IEA"]
        verif_result = anti_hallucination_verifier.verify_document(raw_text, trace_data, allowed_citations)
        doc_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        lines.append(f"Verification Status : {verif_result['compliance_status']}")
        lines.append(f"Document SHA-256    : {doc_hash}")
        lines.append("=" * 80)

        final_text = "\n".join(lines)

        return {
            "title": f"Police Case Diary - {case_ref}",
            "case_ref": case_ref,
            "raw_text": final_text,
            "sha256": doc_hash,
            "verification": verif_result
        }

    def generate_bank_freeze_notice(
        self,
        trace_data: Dict[str, Any],
        target_bank: str,
        case_ref: str = "CYBER/IND/2026/0891",
        profile_id: str = "indore_default",
        use_ollama: bool = True
    ) -> Dict[str, Any]:
        """
        Generate formal statutory Bank Lien / Freezing Notice with code-selected legal pack clauses.
        Uses Ollama strictly as a prose writer (if running), falling back to deterministic template.
        """
        all_recs = trace_data.get("freeze_recommendations", [])
        if not all_recs:
            return {"error": "No recoverable accounts identified for freezing in this money trail."}

        bank_freezes = [f for f in all_recs if f.get("bank") == target_bank]
        if not bank_freezes:
            bank_amounts = {}
            for f in all_recs:
                b = f.get("bank", "UNKNOWN")
                bank_amounts[b] = bank_amounts.get(b, 0.0) + f.get("held_inr", 0.0)
            target_bank = max(bank_amounts, key=bank_amounts.get)
            bank_freezes = [f for f in all_recs if f.get("bank") == target_bank]

        bank_info = self.banks_map.get(target_bank, {
            "name": f"{target_bank} Bank",
            "nodal_email": f"nodal.{target_bank.lower()}@bank.co.in",
            "nodal_desk": "Nodal Cyber Crime Cell Liaison Desk"
        })

        total_lien_inr = sum(f["held_inr"] for f in bank_freezes)
        date_str = datetime.datetime.now().strftime("%d-%B-%Y")

        profile = legal_pack.get_profile(profile_id)
        staleness = legal_pack.check_staleness()
        allowed_citations = legal_pack.get_allowed_citations(profile_id)

        context_vars = {
            "amount": f"₹{total_lien_inr:,.2f}",
            "case_ref": case_ref,
            "review_days": profile.get("review_days", 15),
            "max_days": profile.get("max_days", 90),
            "bank_name": bank_info["name"]
        }

        clauses = legal_pack.get_clauses(profile_id=profile_id, lang="en", context=context_vars)

        claims = [
            {"id": "claim_victim", "fact": f"Victim account {trace_data['victim_account']} lost ₹{trace_data['initial_loss_inr']:,.2f} through financial cyber fraud."},
            {"id": "claim_disputed_total", "fact": f"Forensic tracing identified ₹{total_lien_inr:,.2f} currently held across {len(bank_freezes)} beneficiary account(s) at {bank_info['name']}."},
            {"id": "claim_accounts", "fact": ", ".join([f"{f['acct_no']} (IFSC: {f['ifsc']}, ₹{f['held_inr']:,.2f})" for f in bank_freezes])}
        ]

        writer_used = "Deterministic Engine (Verified Template)"
        ollama_prose = None

        if use_ollama:
            try:
                ollama_prose = draft_notice_with_ollama(claims=claims, clauses=clauses, timeout_sec=15.0)
                if ollama_prose and "sections" in ollama_prose and len(ollama_prose["sections"]) > 0:
                    writer_used = "Ollama Local Model (Schema-Constrained Writer)"
            except Exception:
                ollama_prose = None

        lines = []
        lines.append("=" * 80)
        lines.append("DRAFT — TO BE REVIEWED AND SIGNED BY THE COMPETENT INVESTIGATING OFFICER")
        if staleness.get("is_stale"):
            lines.append(f"⚠️  NOTICE WARNING: {staleness['warning']}")
        lines.append(f"LEGAL PACK VERSION: {legal_pack.pack_version} | PROFILE: {profile.get('name', profile_id)}")
        lines.append("=" * 80)
        lines.append(f"STATUTORY NOTICE & REQUISITION: {profile.get('title', 'Notice under Section 94 BNSS')}")
        lines.append(f"MEMO NO: IND/CYBER/{case_ref}/{target_bank}                      DATE: {date_str}")
        lines.append(f"\nTO:")
        lines.append(f"  The Nodal Officer / Cyber Crime Liaison Desk,")
        lines.append(f"  {bank_info['name']},")
        lines.append(f"  {bank_info['nodal_desk']}")
        lines.append(f"  Email: {bank_info['nodal_email']}")
        lines.append(f"\nSUBJECT: STATUTORY REQUISITION FOR PRODUCTION OF RECORDS AND LIEN MARKING ON DISPUTED PROCEEDS")
        lines.append(f"REF    : Cyber Crime Complaint Ref: {case_ref}")
        lines.append("-" * 80)
        lines.append("Sir/Madam,\n")

        # Factual Premise
        lines.append(
            f"WHEREAS, an investigation is underway at the State Cyber Police Station, Indore Commissionerate, "
            f"into cyber syndicate fraud wherein ₹{trace_data['initial_loss_inr']:,.2f} was siphoned from victim account "
            f"{trace_data['victim_account']}. In-memory multi-hop causal tracing has established that tainted proceeds "
            f"flowed into the following beneficiary account(s) maintained with your bank:"
        )

        # Annexure-A Table
        lines.append("\nANNEXURE-A: BENEFICIARY ACCOUNTS SUBJECT TO DISPUTED AMOUNT LIEN")
        lines.append(f"{'SL':<4} | {'ACCOUNT NUMBER':<16} | {'IFSC CODE':<12} | {'LIEN AMOUNT (INR)':<18} | {'LAYER / ROLE':<14}")
        lines.append("-" * 75)
        for idx, f in enumerate(bank_freezes, 1):
            lines.append(f"{idx:<4} | {f['acct_no']:<16} | {f['ifsc']:<12} | ₹{f['held_inr']:<17,.2f} | {f['layer']:<14}")
        lines.append("-" * 75)
        lines.append(f"TOTAL TRACED SUM TO BE LIEN-MARKED: ₹{total_lien_inr:,.2f}")

        # Statutory Clauses (From reviewed Legal Pack)
        lines.append("\nDIRECTIONS FOR STATUTORY COMPLIANCE (CODE-SELECTED CLAUSES):")
        for idx, clause in enumerate(clauses, 1):
            lines.append(f"{idx}. [{clause['id']}] {clause['text']}")

        # If Ollama provided structured narrative, append verified prose
        if ollama_prose and "sections" in ollama_prose:
            lines.append("\nFORENSIC FACTUAL SUMMARY (COMPOSED BY OLLAMA WRITER):")
            for sec in ollama_prose["sections"]:
                heading = sec.get("heading", "")
                if heading:
                    lines.append(f"\n[{heading}]")
                for s in sec.get("sentences", []):
                    lines.append(f"• {s.get('text', '')}")

        lines.append("\nISSUED UNDER OFFICIAL SEAL OF:")
        lines.append("Investigating Officer, State Cyber Crime Branch")
        lines.append("Police Commissionerate, Indore (Madhya Pradesh)")

        raw_text = "\n".join(lines)

        # Run Dual Verification (Facts + Legal Citations)
        verif_result = anti_hallucination_verifier.verify_document(raw_text, trace_data, allowed_citations)
        doc_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        return {
            "bank": target_bank,
            "bank_name": bank_info["name"],
            "profile_id": profile_id,
            "profile_name": profile.get("name", profile_id),
            "pack_version": legal_pack.pack_version,
            "writer_engine": writer_used,
            "staleness": staleness,
            "watch_list": legal_pack.watch_list,
            "accounts_count": len(bank_freezes),
            "total_lien_inr": total_lien_inr,
            "raw_text": raw_text,
            "sha256": doc_hash,
            "verification": verif_result
        }

    def generate_hindi_freeze_notice(
        self,
        trace_data: Dict[str, Any],
        target_bank: str,
        case_ref: str = "CYBER/IND/2026/0891",
        profile_id: str = "indore_default"
    ) -> Dict[str, Any]:
        """
        Generate statutory Bank Freezing / Lien Notice in Hindi using fixed, human-reviewed clauses.
        """
        all_recs = trace_data.get("freeze_recommendations", [])
        if not all_recs:
            return {"error": "No recoverable accounts identified for freezing in this money trail."}

        bank_freezes = [f for f in all_recs if f.get("bank") == target_bank]
        if not bank_freezes:
            bank_amounts = {}
            for f in all_recs:
                b = f.get("bank", "UNKNOWN")
                bank_amounts[b] = bank_amounts.get(b, 0.0) + f.get("held_inr", 0.0)
            target_bank = max(bank_amounts, key=bank_amounts.get)
            bank_freezes = [f for f in all_recs if f.get("bank") == target_bank]

        bank_info = self.banks_map.get(target_bank, {
            "name": f"{target_bank} Bank",
            "nodal_email": f"nodal.{target_bank.lower()}@bank.co.in",
            "nodal_desk": "Nodal Cyber Crime Cell Liaison Desk"
        })

        total_lien_inr = sum(f["held_inr"] for f in bank_freezes)
        date_str = datetime.datetime.now().strftime("%d-%B-%Y")

        profile = legal_pack.get_profile(profile_id)
        staleness = legal_pack.check_staleness()
        allowed_citations = legal_pack.get_allowed_citations(profile_id)

        context_vars = {
            "amount": f"{total_lien_inr:,.2f}",
            "case_ref": case_ref,
            "review_days": profile.get("review_days", 15),
            "max_days": profile.get("max_days", 90),
            "bank_name": bank_info["name"]
        }

        clauses_hi = legal_pack.get_clauses(profile_id=profile_id, lang="hi", context=context_vars)

        lines = []
        lines.append("=" * 80)
        lines.append("प्रारूप (DRAFT) — सक्षम जांच अधिकारी द्वारा समीक्षा एवं हस्ताक्षर हेतु")
        if staleness.get("is_stale"):
            lines.append(f"⚠️  चेतावनी: {staleness['warning']}")
        lines.append(f"लीगल पैक संस्करण: {legal_pack.pack_version} | प्रोफाइल: {profile.get('name', profile_id)}")
        lines.append("=" * 80)
        lines.append("वैधानिक मांग-पत्र एवं बैंक लीन (होल्ड) आदेश")
        lines.append(f"संदर्भ क्रमांक: IND/CYBER/{case_ref}/{target_bank}                      दिनांक: {date_str}")
        lines.append(f"\nसेवा में:")
        lines.append(f"  नोडल अधिकारी / साइबर अपराध संपर्क कक्ष,")
        lines.append(f"  {bank_info['name']},")
        lines.append(f"  {bank_info['nodal_desk']}")
        lines.append(f"  ईमेल: {bank_info['nodal_email']}")
        lines.append(f"\nविषय: साइबर अपराध में संलिप्त लाभार्थी खातों पर विवादित राशि का डेबिट लीन (होल्ड) अंकित करने एवं अभिलेख उपलब्ध कराने बाबत।")
        lines.append(f"संदर्भ: साइबर अपराध शिकायत क्रमांक: {case_ref}")
        lines.append("-" * 80)
        lines.append("महोदय/महोदया,\n")
        lines.append(
            f"कार्यालय राज्य साइबर पुलिस थाना, पुलिस कमिश्नरेट इंदौर में एक संगठित साइबर धोखाधड़ी की विवेचना की जा रही है, "
            f"जिसमें पीड़ित खाता {trace_data['victim_account']} से कुल ₹{trace_data['initial_loss_inr']:,.2f} की राशि अवैध रूप से हस्तांतरित कराई गई थी। "
            f"डिजिटल फॉरेंसिक साक्ष्यों के विश्लेषण अनुसार, उक्त अपराध की राशि आपके बैंक में संधारित निम्नलिखित लाभार्थी खातों में प्राप्त होना प्रमाणित हुई है:"
        )

        lines.append("\nअनुलग्नक-क: विवादित राशि पर डेबिट लीन (होल्ड) हेतु खातों की सूची")
        lines.append(f"{'क्र.':<4} | {'खाता संख्या':<16} | {'आईएफएससी (IFSC)':<14} | {'लीन राशि (INR)':<18} | {'भूमिका / स्तर':<14}")
        lines.append("-" * 75)
        for idx, f in enumerate(bank_freezes, 1):
            lines.append(f"{idx:<4} | {f['acct_no']:<16} | {f['ifsc']:<14} | ₹{f['held_inr']:<17,.2f} | {f['layer']:<14}")
        lines.append("-" * 75)
        lines.append(f"लीन अंकित की जाने वाली कुल राशि: ₹{total_lien_inr:,.2f}")

        lines.append("\nवैधानिक निर्देश (मानव-समीक्षित लीगल पैक से चयनित खंड):")
        for idx, clause in enumerate(clauses_hi, 1):
            lines.append(f"{idx}. [{clause['id']}] {clause['text']}")

        lines.append("\nसील एवं हस्ताक्षर:")
        lines.append("जांच अधिकारी, राज्य साइबर अपराध शाखा")
        lines.append("पुलिस कमिश्नरेट, इंदौर (मध्य प्रदेश)")

        raw_text = "\n".join(lines)

        verif_result = anti_hallucination_verifier.verify_document(raw_text, trace_data, allowed_citations)
        doc_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        return {
            "bank": target_bank,
            "bank_name": bank_info["name"],
            "profile_id": profile_id,
            "profile_name": profile.get("name", profile_id),
            "pack_version": legal_pack.pack_version,
            "writer_engine": "Human-Reviewed Fixed Hindi Clauses (Zero Translation Hallucination)",
            "staleness": staleness,
            "watch_list": legal_pack.watch_list,
            "accounts_count": len(bank_freezes),
            "total_lien_inr": total_lien_inr,
            "raw_text": raw_text,
            "sha256": doc_hash,
            "verification": verif_result
        }

legal_generator = LegalReportGenerator()
