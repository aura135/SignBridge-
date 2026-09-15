from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    message: str

class SignToConversationRequest(BaseModel):
    frames: List[str] = Field(..., description="Base64 encoded JPEG/PNG frame buffer (1 to 10 frames)")
    min_confidence: Optional[float] = 0.65
    temporal_window_ms: Optional[int] = 1200
    previous_sign: Optional[str] = None

class SignToConversationResponse(BaseModel):
    recognized: bool
    sign: Optional[str] = None
    english_caption: Optional[str] = None
    telugu_translation: Optional[str] = None
    confidence: float
    category: Optional[str] = None
    is_new_sign: bool = True
    motion_description: Optional[str] = None
    latency_ms: Optional[float] = None
    status_message: str

class ConversationToSignRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source_language: Optional[str] = "auto"  # "en", "te", "auto"
    avatar_gender: Optional[str] = "female"  # "male" or "female"
    speed: Optional[float] = 1.0

class AvatarKeyframe(BaseModel):
    sign: str
    duration_ms: int
    left_hand: Dict[str, Any]
    right_hand: Dict[str, Any]
    head: Dict[str, Any]
    face: Dict[str, Any]
    description: str

class ConversationToSignResponse(BaseModel):
    input_text: str
    detected_language: str
    english_text: str
    telugu_text: str
    isl_grammar_structure: str
    isl_sequence: List[str]
    timeline: List[AvatarKeyframe]
    total_duration_ms: int

class TranslateRequest(BaseModel):
    text: str
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "te"

class TranslateResponse(BaseModel):
    source_text: str
    source_lang: str
    target_lang: str
    translated_text: str

class SpeechToTextRequest(BaseModel):
    audio_base64: Optional[str] = None
    language: Optional[str] = "en-IN"  # "en-IN" or "te-IN"

class SpeechToTextResponse(BaseModel):
    transcript: str
    language: str
    confidence: float
