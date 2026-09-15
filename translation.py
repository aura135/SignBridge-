import os
import requests
from typing import Optional, Dict
from backend.services.model_loader import model_loader

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class TranslationService:
    def __init__(self):
        self.gemini_client = None
        if os.getenv("GEMINI_API_KEY") and GENAI_AVAILABLE:
            try:
                self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            except Exception as e:
                print(f"[TranslationService] Error initializing Gemini: {e}")

    def translate(self, text: str, source_lang: str = "en", target_lang: str = "te") -> Dict[str, str]:
        if not text or not text.strip():
            return {"source_text": text, "source_lang": source_lang, "target_lang": target_lang, "translated_text": ""}

        text_clean = text.strip()

        # Check vocabulary cache first for instant response
        for item in model_loader.vocabulary.values():
            if source_lang == "en" and target_lang == "te":
                if item.get("english", "").lower() == text_clean.lower() or item.get("gloss", "").lower() == text_clean.lower():
                    return {
                        "source_text": text_clean,
                        "source_lang": source_lang,
                        "target_lang": target_lang,
                        "translated_text": item.get("telugu", "")
                    }
            elif source_lang == "te" and target_lang == "en":
                if item.get("telugu", "") == text_clean:
                    return {
                        "source_text": text_clean,
                        "source_lang": source_lang,
                        "target_lang": target_lang,
                        "translated_text": item.get("english", "")
                    }

        # Check external translation API
        external_url = os.getenv("TRANSLATION_API_URL")
        if external_url:
            try:
                headers = {"Content-Type": "application/json"}
                api_key = os.getenv("TRANSLATION_API_KEY")
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"
                res = requests.post(external_url, json={"text": text_clean, "source": source_lang, "target": target_lang}, headers=headers, timeout=4)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "source_text": text_clean,
                        "source_lang": source_lang,
                        "target_lang": target_lang,
                        "translated_text": data.get("translated_text", "")
                    }
            except Exception as e:
                print(f"[TranslationService] External translation error: {e}")

        # Use Gemini Language Translation
        if self.gemini_client or os.getenv("GEMINI_API_KEY"):
            try:
                if not self.gemini_client:
                    self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

                prompt = (
                    f"Translate the following text accurately from {source_lang} to {target_lang}. "
                    "If translating into Telugu, output native Telugu script with accurate polite Indian phrasing. "
                    "Return only the translated sentence without explanation.\n\n"
                    f"Text: {text_clean}"
                )

                response = self.gemini_client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                )
                translated = response.text.strip() if response.text else text_clean
                return {
                    "source_text": text_clean,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                    "translated_text": translated
                }
            except Exception as e:
                print(f"[TranslationService] Gemini translation error: {e}")
                raise RuntimeError("Translation service unavailable.")

        raise RuntimeError("Translation service unavailable.")

translation_service = TranslationService()
