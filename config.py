"""
CashCompass On-Device Model & Runtime Configuration
Targets ExecuTorch Llama (.pte) + SentencePiece (tokenizer.model) offline execution.
"""

from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
MODELS_DIR = ROOT_DIR / "ml" / "artifacts"


@dataclass(frozen=True)
class ModelReleaseConfig:
    release_tag: str = "model-V1"
    pte_filename: str = "finance_assistant.pte"
    pte_expected_size_mb: float = 770.0
    pte_sha256_prefix: str = "af9401bfab2aaa0821b74f653fb2a"
    tokenizer_filename: str = "tokenizer.model"
    tokenizer_expected_size_mb: float = 2.08
    tokenizer_sha256_prefix: str = "82e9d31979e92ab929cd544440f12"


@dataclass(frozen=True)
class OptimizationConfig:
    # INT4 4-bit groupwise weight quantization (group_size=32) for XNNPACK CPU/NEON acceleration
    weight_bits: int = 4
    group_size: int = 32
    use_xnnpack_delegate: bool = True
    use_kv_cache: bool = True
    static_prefix_kv_cache: bool = True
    max_seq_len: int = 2048
    max_new_tokens: int = 192
    cpu_threads: int = 4
    temperature: float = 0.0  # Greedy decoding for deterministic intent parsing & speed
    speculative_ngram_lookahead: int = 4


MODEL_CONFIG = ModelReleaseConfig()
OPTIMIZATION_CONFIG = OptimizationConfig()
