import os
import json
import time
import requests
from typing import List, Dict, Any, Optional, Tuple
from backend.services.model_loader import model_loader
from backend.services.preprocessing import preprocess_temporal_frames

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

MIN_CONFIDENCE_DEFAULT = float(os.getenv("MODEL_MIN_CONFIDENCE", "0.65"))

class ISLRecognitionService:
    def __init__(self):
        self.min_confidence = MIN_CONFIDENCE_DEFAULT
        self.gemini_client = None
        if os.getenv("GEMINI_API_KEY") and GENAI_AVAILABLE:
            try:
                self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            except Exception as e:
                print(f"[ISLRecognitionService] Error initializing Gemini client: {e}")

    def recognize(
        self,
        frames: List[str],
        min_confidence: Optional[float] = None,
        previous_sign: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes temporal frames through the configured ISL recognition pipeline.
        Returns recognized ISL gloss, English caption, Telugu translation, confidence, and duplicate flags.
        """
        threshold = min_confidence if min_confidence is not None else self.min_confidence
        start_time = time.time()

        if not frames or len(frames) == 0:
            return {
                "recognized": False,
                "status_message": "No frames provided in buffer.",
                "confidence": 0.0,
                "is_new_sign": False
            }

        # Preprocessing: sample 1-4 frames uniformly for temporal gesture motion analysis
        processed_frames = preprocess_temporal_frames(frames, target_size=(384, 384), max_samples=3)
        if not processed_frames:
            return {
                "recognized": False,
                "status_message": "Frame preprocessing failed.",
                "confidence": 0.0,
                "is_new_sign": False
            }

        # Check external model URL first
        external_url = os.getenv("ISL_MODEL_API_URL")
        if external_url:
            return self._call_external_model(processed_frames, external_url, threshold, previous_sign, start_time)

        # Use Gemini Vision temporal pipeline
        if self.gemini_client or os.getenv("GEMINI_API_KEY"):
            return self._call_gemini_vision(processed_frames, threshold, previous_sign, start_time)

        # If no model configured, honor Requirement 20 & 24:
        return {
            "recognized": False,
            "status_message": "ISL recognition model is not configured. Please configure GEMINI_API_KEY or ISL_MODEL_API_URL in backend environment.",
            "confidence": 0.0,
            "is_new_sign": False
        }

    def _call_gemini_vision(
        self,
        frames_b64: List[str],
        threshold: float,
        previous_sign: Optional[str],
        start_time: float
    ) -> Dict[str, Any]:
        if not self.gemini_client:
            if not os.getenv("GEMINI_API_KEY"):
                return {
                    "recognized": False,
                    "status_message": "ISL recognition model is not configured. GEMINI_API_KEY is missing.",
                    "confidence": 0.0,
                    "is_new_sign": False
                }
            self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        vocab_keys = list(model_loader.vocabulary.keys())
        sample_vocab = vocab_keys[:80]

        system_instruction = (
            "You are an expert Indian Sign Language (ISL) Vision Recognition Model trained on datasets like INCLUDE-ISL. "
            "Analyze the provided webcam temporal frames showing a user signing in front of the camera. "
            "Identify the handshapes, finger positions, two-hand coordination, spatial location (face, chest, neutral space), "
            "and motion trajectory. Match the sign against known Indian Sign Language vocabulary.\n"
            f"Allowed standard ISL glosses include: {', '.join(sample_vocab)}.\n"
            "Respond strictly with valid JSON with keys:\n"
            "{\n"
            '  "detected": true/false,\n'
            '  "gloss": "EXACT_ISL_GLOSS_UPPERCASE",\n'
            '  "confidence": 0.0 to 1.0,\n'
            '  "hand_action": "brief description of hand shape and movement seen",\n'
            '  "english": "Natural English translation",\n'
            '  "telugu": "Accurate Telugu translation in Telugu script"\n'
            "}\n"
            "If no clear sign is being made (e.g. idle hands, transitions, resting hands), set detected to false and confidence below 0.5."
        )

        parts = []
        for b64 in frames_b64:
            parts.append(types.Part.from_bytes(
                data=b64.encode('utf-8') if isinstance(b64, bytes) else b64,
                mime_type="image/jpeg"
            ))

        parts.append(types.Part.from_text(
            text=f"Analyze these sequential frames for Indian Sign Language gesture. Previous recognized sign was: {previous_sign or 'None'}."
        ))

        try:
            response = self.gemini_client.models.generate_content(
                model="gemini-3.8-flash",
                contents=parts,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

            latency = round((time.time() - start_time) * 1000, 1)
            raw_text = response.text.strip() if response.text else "{}"
            data = json.loads(raw_text)

            detected = data.get("detected", False)
            gloss = str(data.get("gloss", "")).strip().upper()
            confidence = float(data.get("confidence", 0.0))

            if not detected or confidence < threshold or not gloss:
                return {
                    "recognized": False,
                    "status_message": f"Analyzing gesture (confidence {int(confidence * 100)}% below {int(threshold * 100)}% threshold)",
                    "confidence": confidence,
                    "is_new_sign": False,
                    "latency_ms": latency
                }

            # Enrich from vocabulary database if available
            vocab_info = model_loader.get_sign_details(gloss)
            english = data.get("english") or (vocab_info.get("english") if vocab_info else gloss.title())
            telugu = data.get("telugu") or (vocab_info.get("telugu") if vocab_info else "")
            category = vocab_info.get("category") if vocab_info else "general"

            # Duplicate suppression: check if sign is identical to continuously held gesture
            is_new = (gloss != previous_sign)

            return {
                "recognized": True,
                "sign": gloss,
                "english_caption": english,
                "telugu_translation": telugu,
                "confidence": round(confidence, 2),
                "category": category,
                "is_new_sign": is_new,
                "motion_description": data.get("hand_action", vocab_info.get("movement") if vocab_info else None),
                "latency_ms": latency,
                "status_message": f"Recognized ISL Sign: {gloss} ({int(confidence * 100)}% confidence)"
            }

        except Exception as e:
            err_str = str(e)
            is_429 = "429" in err_str or "Quota exceeded" in err_str or "RESOURCE_EXHAUSTED" in err_str
            is_503 = "503" in err_str or "high demand" in err_str or "UNAVAILABLE" in err_str

            if is_429:
                return {
                    "recognized": False,
                    "status_message": "Gemini free-tier quota reached (5 RPM limit). Cooling down for 10s...",
                    "confidence": 0.0,
                    "is_new_sign": False,
                    "cooldown_sec": 10,
                    "rate_limited": True,
                    "latency_ms": round((time.time() - start_time) * 1000, 1)
                }

            if is_503:
                return {
                    "recognized": False,
                    "status_message": "Model is experiencing temporary high demand (503). Retrying in 8s...",
                    "confidence": 0.0,
                    "is_new_sign": False,
                    "cooldown_sec": 8,
                    "rate_limited": True,
                    "latency_ms": round((time.time() - start_time) * 1000, 1)
                }

            print(f"[ISLRecognitionService] Gemini inference notice: {e}")
            return {
                "recognized": False,
                "status_message": f"Recognition notice: {err_str}",
                "confidence": 0.0,
                "is_new_sign": False,
                "latency_ms": round((time.time() - start_time) * 1000, 1)
            }

    def _call_external_model(
        self,
        frames: List[str],
        url: str,
        threshold: float,
        previous_sign: Optional[str],
        start_time: float
    ) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        api_key = os.getenv("ISL_MODEL_API_KEY")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "frames": frames,
            "previous_sign": previous_sign,
            "min_confidence": threshold
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=5)
            latency = round((time.time() - start_time) * 1000, 1)
            if resp.status_code == 200:
                data = resp.json()
                data["latency_ms"] = latency
                return data
            else:
                return {
                    "recognized": False,
                    "status_message": f"External model returned error HTTP {resp.status_code}",
                    "confidence": 0.0,
                    "is_new_sign": False,
                    "latency_ms": latency
                }
        except Exception as e:
            return {
                "recognized": False,
                "status_message": f"External ISL model connection error: {str(e)}",
                "confidence": 0.0,
                "is_new_sign": False
            }

isl_service = ISLRecognitionService()
