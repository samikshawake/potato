"""
SentencePiece Tokenizer Bridge (`tokenizer.model`) for CashCompass.
Provides sub-millisecond subword encoding/decoding and merchant token normalization
without network dependencies.
"""

from __future__ import annotations

from pathlib import Path
from typing import List


class CashCompassTokenizer:
    def __init__(self, model_path: Path) -> None:
        self.model_path = model_path
        self._sp = None
        if model_path.exists():
            import sentencepiece as spm
            self._sp = spm.SentencePieceProcessor(model_file=str(model_path))

    def encode(self, text: str, bos: bool = True, eos: bool = False) -> List[int]:
        if self._sp is not None:
            ids: List[int] = self._sp.encode(text, out_type=int)
            if bos:
                ids = [self._sp.bos_id()] + ids
            if eos:
                ids = ids + [self._sp.eos_id()]
            return ids
        # Deterministic byte-fallback when running unit tests prior to model download
        return [128000] + [b + 256 for b in text.encode("utf-8")]

    def decode(self, token_ids: List[int]) -> str:
        if self._sp is not None:
            return self._sp.decode(token_ids)
        raw = bytes([tid - 256 for tid in token_ids if 256 <= tid < 512])
        return raw.decode("utf-8", errors="replace")
