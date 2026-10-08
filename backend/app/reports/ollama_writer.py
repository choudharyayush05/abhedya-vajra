"""
Ollama Integration Module for Operation Vajra.
Role: The model is used solely as a WRITER, NOT THE SOURCE OF LAW.
Translates verified forensic claims into structured, readable prose.
Statutory section numbers are never written by the model; they are selected
exclusively from the pre-approved legal pack.
"""

import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an offline legal draft formatting assistant for Indian Cyber Crime Police.
Your task is to take verified forensic claims and pre-approved statutory clauses, and assemble them into clear, professional notice paragraphs.

STRICT CONSTRAINTS (VIOLATIONS RESULT IN AUTOMATIC REJECTION BY VERIFIER):
1. USE ONLY the claims, factual placeholders, and statutory clauses provided in the user prompt.
2. DO NOT INVENT, GUESS, OR CITE ANY STATUTORY SECTION NUMBERS YOURSELF. All legal sections must come directly from the provided clauses.
3. NEVER ASSERT GUILT OR CALL PARTIES CRIMINALS. Refer to accounts only as "beneficiary account linked to disputed transaction", "suspected intermediary entity", or "recipient account".
4. OUTPUT STRICTLY valid JSON conforming to the requested schema.
"""

OLLAMA_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string"},
                    "sentences": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "claim_ids": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": ["text", "claim_ids"]
                        }
                    }
                },
                "required": ["heading", "sentences"]
            }
        }
    },
    "required": ["sections"]
}

def draft_notice_with_ollama(
    claims: List[Dict[str, Any]],
    clauses: List[Dict[str, str]],
    model: str = "qwen2.5:7b-instruct",
    endpoint: str = "http://127.0.0.1:11434/api/chat",
    timeout_sec: float = 25.0
) -> Optional[Dict[str, Any]]:
    """
    Calls local Ollama instance with schema-constrained JSON output.
    Returns parsed JSON dictionary on success, or None on failure/timeout.
    """
    try:
        import httpx
    except ImportError:
        logger.warning("httpx not installed; falling back to deterministic template rendering.")
        return None

    user_payload = {
        "instruction": "Draft the forensic notice text combining these verified claims and approved statutory clauses.",
        "claims": claims,
        "approved_statutory_clauses": clauses
    }

    req_body = {
        "model": model,
        "stream": False,
        "format": OLLAMA_JSON_SCHEMA,
        "options": {
            "temperature": 0.1,
            "seed": 42,
            "num_ctx": 4096
        },
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)}
        ]
    }

    try:
        with httpx.Client(timeout=timeout_sec) as client:
            resp = client.post(endpoint, json=req_body)
            if resp.status_code != 200:
                logger.info(f"Ollama returned HTTP {resp.status_code}. Using deterministic template fallback.")
                return None
            data = resp.json()
            message_content = data.get("message", {}).get("content", "")
            if not message_content:
                return None
            parsed = json.loads(message_content)
            return parsed
    except Exception as e:
        logger.info(f"Ollama local writer unavailable ({e}). Seamlessly using deterministic template fallback.")
        return None
