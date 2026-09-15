import os
import re
import requests
from typing import Dict, Any, List
from backend.services.translation import translation_service
from backend.services.isl_grammar import transform_english_to_isl
from backend.services.avatar_signing import avatar_service

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

TELUGU_UNICODE_RANGE = re.compile(r'[\u0c00-\u0c7f]')

class TextToSignService:
    def __init__(self):
        self.gemini_client = None
        if os.getenv("GEMINI_API_KEY") and GENAI_AVAILABLE:
            try:
                self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            except Exception as e:
                print(f"[TextToSignService] Gemini init: {e}")

    def detect_language(self, text: str) -> str:
        if TELUGU_UNICODE_RANGE.search(text):
            return "te"
        return "en"

    def process(self, text: str, source_language: str = "auto", speed: float = 1.0) -> Dict[str, Any]:
        text_clean = text.strip()
        if not text_clean:
            return {
                "input_text": "",
                "detected_language": "en",
                "english_text": "",
                "telugu_text": "",
                "isl_grammar_structure": "Empty input",
                "isl_sequence": [],
                "timeline": [],
                "total_duration_ms": 0
            }

        # Language detection
        detected_lang = source_language if source_language in ("en", "te") else self.detect_language(text_clean)

        # External API check
        external_url = os.getenv("TEXT_TO_SIGN_API_URL")
        if external_url:
            try:
                headers = {"Content-Type": "application/json"}
                api_key = os.getenv("TEXT_TO_SIGN_API_KEY")
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"
                resp = requests.post(external_url, json={"text": text_clean, "language": detected_lang}, headers=headers, timeout=4)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                print(f"[TextToSignService] External text-to-sign error: {e}")

        # Bilingual alignment
        if detected_lang == "te":
            telugu_text = text_clean
            try:
                trans_result = translation_service.translate(text_clean, source_lang="te", target_lang="en")
                english_text = trans_result.get("translated_text", text_clean)
            except Exception:
                english_text = text_clean
        else:
            english_text = text_clean
            try:
                trans_result = translation_service.translate(text_clean, source_lang="en", target_lang="te")
                telugu_text = trans_result.get("translated_text", "")
            except Exception:
                telugu_text = ""

        # Use Gemini for deep ISL semantic grammar parsing if configured, or grammatical rules engine
        isl_sequence = []
        structure_desc = ""

        if self.gemini_client or os.getenv("GEMINI_API_KEY"):
            try:
                if not self.gemini_client:
                    self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

                prompt = (
                    "You are a computational linguist specializing in Indian Sign Language (ISL) grammar. "
                    "Convert the following sentence into a strictly ordered sequence of standard ISL glosses "
                    "following ISL syntax (Subject-Object-Verb order, Time-first, Question-words last, no copulas/articles).\n"
                    f"English: \"{english_text}\"\n"
                    f"Telugu: \"{telugu_text}\"\n"
                    "Respond ONLY with a JSON object: {\"isl_sequence\": [\"GLOSS_1\", \"GLOSS_2\", ...], \"structure\": \"Explanation of syntax\"}"
                )

                response = self.gemini_client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )

                import json
                parsed = json.loads(response.text.strip())
                isl_sequence = [str(g).upper().strip() for g in parsed.get("isl_sequence", []) if g]
                structure_desc = parsed.get("structure", "ISL SOV Syntax")
            except Exception as e:
                print(f"[TextToSignService] Fallback to rule engine: {e}")

        if not isl_sequence:
            grammar_result = transform_english_to_isl(english_text)
            isl_sequence = grammar_result["isl_sequence"]
            structure_desc = grammar_result["structure"]

        # Generate avatar 3D skeletal keyframe timeline
        timeline = avatar_service.generate_animation_timeline(isl_sequence, speed=speed)
        total_duration = sum(kf["duration_ms"] for kf in timeline)

        return {
            "input_text": text_clean,
            "detected_language": detected_lang,
            "english_text": english_text,
            "telugu_text": telugu_text,
            "isl_grammar_structure": structure_desc,
            "isl_sequence": isl_sequence,
            "timeline": timeline,
            "total_duration_ms": total_duration
        }

text_to_sign_service = TextToSignService()
