import os
import requests
import base64
from typing import Dict, Any, Optional

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class SpeechToTextService:
    def __init__(self):
        self.gemini_client = None
        if os.getenv("GEMINI_API_KEY") and GENAI_AVAILABLE:
            try:
                self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            except Exception as e:
                print(f"[SpeechToTextService] Gemini init: {e}")

    def transcribe_audio(self, audio_base64: str, language: str = "en-IN") -> Dict[str, Any]:
        """
        Transcribes base64 encoded audio (WAV / MP3 / WEBM) into text in the specified language (en-IN or te-IN).
        """
        if not audio_base64 or not audio_base64.strip():
            return {"transcript": "", "language": language, "confidence": 0.0}

        # Check external speech-to-text service
        external_url = os.getenv("SPEECH_TO_TEXT_API_URL")
        if external_url:
            try:
                headers = {"Content-Type": "application/json"}
                api_key = os.getenv("SPEECH_TO_TEXT_API_KEY")
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"
                res = requests.post(external_url, json={"audio": audio_base64, "language": language}, headers=headers, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "transcript": data.get("transcript", ""),
                        "language": language,
                        "confidence": float(data.get("confidence", 0.95))
                    }
            except Exception as e:
                print(f"[SpeechToTextService] External STT error: {e}")

        # Use Gemini Audio Transcription
        if self.gemini_client or os.getenv("GEMINI_API_KEY"):
            try:
                if not self.gemini_client:
                    self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

                clean_b64 = audio_base64.split(",", 1)[1] if "," in audio_base64 else audio_base64

                lang_prompt = "English (Indian accent)" if "en" in language else "Telugu (Indian native speech)"
                prompt = (
                    f"Transcribe this audio recording precisely in {lang_prompt}. "
                    "Output only the transcribed text without quotes or commentary."
                )

                audio_part = types.Part.from_bytes(
                    data=base64.b64decode(clean_b64),
                    mime_type="audio/webm"
                )

                response = self.gemini_client.models.generate_content(
                    model="gemini-3.5-transcribe",
                    contents=[audio_part, prompt],
                )

                text = response.text.strip() if response.text else ""
                return {
                    "transcript": text,
                    "language": language,
                    "confidence": 0.96 if text else 0.0
                }
            except Exception as e:
                print(f"[SpeechToTextService] Gemini transcribe error: {e}")
                raise RuntimeError("Speech-to-text service unavailable.")

        raise RuntimeError("Speech-to-text service unavailable or not configured.")

stt_service = SpeechToTextService()
