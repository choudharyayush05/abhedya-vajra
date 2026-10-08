"""
Legal Pack Manager for Operation Vajra.
Loads human-reviewed statutory legal pack from config/legal_pack.yaml.
Enforces that law comes from versioned configuration, NOT model hallucinations.
"""

import os
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import yaml

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent.parent / "config" / "legal_pack.yaml"

class LegalPackManager:
    def __init__(self, path: Path = CONFIG_PATH):
        self.path = path
        self._pack_data: Dict[str, Any] = {}
        self.reload()

    def reload(self) -> None:
        """Load or reload the legal pack from YAML."""
        if not self.path.exists():
            raise FileNotFoundError(f"Legal pack configuration file not found at: {self.path}")
        with open(self.path, "r", encoding="utf-8") as f:
            self._pack_data = yaml.safe_load(f) or {}

    @property
    def pack_version(self) -> str:
        return self._pack_data.get("pack_version", "UNKNOWN")

    @property
    def valid_as_of(self) -> str:
        return self._pack_data.get("valid_as_of", "")

    @property
    def reviewed_by(self) -> str:
        return self._pack_data.get("reviewed_by", "")

    @property
    def watch_list(self) -> List[str]:
        return self._pack_data.get("watch_list", [])

    def check_staleness(self) -> Dict[str, Any]:
        """
        Check if the legal pack has not been reviewed recently (> 30 days)
        or if reviewed_by sign-off is blank.
        """
        is_stale = False
        warning = None
        days_old = 0

        valid_date_str = self.valid_as_of
        if valid_date_str:
            try:
                valid_date = datetime.datetime.strptime(valid_date_str, "%Y-%m-%d").date()
                today = datetime.date.today()
                days_old = (today - valid_date).days
                if days_old > 30:
                    is_stale = True
                    warning = f"Legal pack not recently reviewed ({days_old} days old) — confirm current law before use."
            except Exception:
                is_stale = True
                warning = "Legal pack validity date is malformed — confirm current law before use."
        else:
            is_stale = True
            warning = "Legal pack validity date missing — confirm current law before use."

        if not self.reviewed_by.strip():
            is_stale = True
            warning = "Legal pack not recently reviewed — confirm current law before use."

        return {
            "is_stale": is_stale,
            "days_old": max(0, days_old),
            "warning": warning,
            "valid_as_of": self.valid_as_of,
            "reviewed_by": self.reviewed_by,
            "pack_version": self.pack_version
        }

    def list_profiles(self) -> List[Dict[str, Any]]:
        """Return list of summary profiles for selection in UI and APIs."""
        res = []
        for pid, p in self._pack_data.get("profiles", {}).items():
            res.append({
                "id": pid,
                "name": p.get("name", pid),
                "title": p.get("title", ""),
                "primary_act": p.get("primary_act", ""),
                "description": p.get("description", ""),
                "clause_count": len(p.get("clauses", [])),
                "review_days": p.get("review_days", 15),
                "max_days": p.get("max_days", 90),
                "allowed_citations": p.get("allowed_citations", [])
            })
        return res

    def get_profile(self, profile_id: str = "indore_default") -> Dict[str, Any]:
        """Get profile details, falling back to indore_default."""
        profiles = self._pack_data.get("profiles", {})
        if profile_id not in profiles:
            profile_id = "indore_default"
        return profiles.get(profile_id, {})

    def get_clauses(
        self,
        profile_id: str = "indore_default",
        lang: str = "en",
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """
        Extract code-selected statutory clauses for the profile,
        interpolating verified context variables (e.g. {AMT}, {CASE_REF}).
        """
        profile = self.get_profile(profile_id)
        clause_ids = profile.get("clauses", [])
        all_clauses = self._pack_data.get("clauses", {})
        review_days = str(profile.get("review_days", 15))
        max_days = str(profile.get("max_days", 90))

        context = context or {}
        replacements = {
            "{AMT}": str(context.get("amount", "disputed amount")),
            "{CASE_REF}": str(context.get("case_ref", "CYBER/IND/2026/0891")),
            "{REVIEW_DAYS}": str(context.get("review_days", review_days)),
            "{MAX_DAYS}": str(context.get("max_days", max_days)),
            "{BANK_NAME}": str(context.get("bank_name", "Target Bank")),
            "{ACCOUNT}": str(context.get("account", "Listed Accounts"))
        }

        result = []
        for cid in clause_ids:
            clause = all_clauses.get(cid)
            if not clause:
                continue
            text = clause.get(lang) or clause.get("en", "")
            # Interpolate placeholders
            for placeholder, val in replacements.items():
                text = text.replace(placeholder, val)
            result.append({
                "id": cid,
                "text": text
            })
        return result

    def get_allowed_citations(self, profile_id: str = "indore_default") -> List[str]:
        profile = self.get_profile(profile_id)
        return profile.get("allowed_citations", [
            "94 BNSS", "106 BNSS", "107 BNSS", "192 BNSS", "63 BSA", "91 CRPC", "102 CRPC", "172 CRPC", "65B IEA"
        ])

legal_pack = LegalPackManager()
