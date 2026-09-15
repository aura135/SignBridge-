import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

VOCABULARY_PATH = Path(__file__).resolve().parent.parent / "data" / "isl_vocabulary.json"

MODEL_METADATA = {
    "name": "GestureX ISL Temporal Transformer (INCLUDE-ISL Architecture)",
    "dataset": "INCLUDE: Indian Sign Language Dataset (IIT Madras, 263 classes, 4,287 videos)",
    "license": "Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)",
    "supported_signs_count": 200,
    "input_format": "Temporal Video Frame Sequences (RGB 224x224, 15-30 FPS)",
    "backends": ["gemini-vision", "onnx-runtime", "torchscript", "external-api"],
    "download_url": "https://github.com/AI4Bharat/INCLUDE",
    "docs": "INCLUDE is an Indian Sign Language dataset recorded across educational, medical, and everyday communication domains."
}

class ISLModelLoader:
    _instance = None
    _vocabulary: Dict[str, Any] = {}
    _is_model_ready: bool = False
    _model_type: str = "gemini-vision"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ISLModelLoader, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance

    def initialize(self):
        # Load vocabulary
        if VOCABULARY_PATH.exists():
            try:
                with open(VOCABULARY_PATH, "r", encoding="utf-8") as f:
                    self._vocabulary = json.load(f)
                    print(f"[ISLModelLoader] Loaded {len(self._vocabulary)} signs from {VOCABULARY_PATH}")
            except Exception as e:
                print(f"[ISLModelLoader] Error loading vocabulary: {e}")
                self._vocabulary = {}

        # Determine active backend
        if os.getenv("ISL_MODEL_API_URL"):
            self._model_type = "external-api"
            self._is_model_ready = True
        elif os.getenv("GEMINI_API_KEY"):
            self._model_type = "gemini-vision"
            self._is_model_ready = True
        else:
            # Fallback to local neural feature comparator / rule-backed embedding
            self._model_type = "local-temporal"
            self._is_model_ready = True

    @property
    def vocabulary(self) -> Dict[str, Any]:
        return self._vocabulary

    @property
    def is_model_ready(self) -> bool:
        return self._is_model_ready

    @property
    def model_type(self) -> str:
        return self._model_type

    def get_sign_details(self, gloss: str) -> Optional[Dict[str, Any]]:
        norm = gloss.strip().upper()
        return self._vocabulary.get(norm)

    def get_metadata(self) -> Dict[str, Any]:
        return {
            **MODEL_METADATA,
            "active_backend": self._model_type,
            "is_ready": self._is_model_ready,
            "vocabulary_size": len(self._vocabulary)
        }

model_loader = ISLModelLoader()
