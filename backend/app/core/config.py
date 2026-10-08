"""
Core configuration loader for Vajra.
"""

from pathlib import Path
from typing import Any, Dict
import yaml

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
CONFIG_DIR = ROOT_DIR / "config"

def load_yaml(filename: str) -> Dict[str, Any]:
    file_path = CONFIG_DIR / filename
    if not file_path.exists():
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}

class AppConfig:
    _instance = None

    def __init__(self):
        self.settings = load_yaml("config.yaml")
        self.banks = load_yaml("banks.yaml").get("banks", {})
        self.schema_map = load_yaml("schema_map.yaml").get("canonical_columns", {})
        self.legal_profiles = load_yaml("legal_profile.yaml").get("legal_profiles", {})

    @classmethod
    def get(cls) -> "AppConfig":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

config = AppConfig.get()
