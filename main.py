import os
import time
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.database.connection import get_db, init_db
from backend.database.models import User, Conversation
from backend.models.schemas import (
    SignupRequest, LoginRequest, AuthResponse,
    SignToConversationRequest, SignToConversationResponse,
    ConversationToSignRequest, ConversationToSignResponse,
    TranslateRequest, TranslateResponse,
    SpeechToTextRequest, SpeechToTextResponse
)
from backend.services.model_loader import model_loader
from backend.services.isl_recognition import isl_service
from backend.services.translation import translation_service
from backend.services.speech_to_text import stt_service
from backend.services.text_to_sign import text_to_sign_service

SECRET_KEY = os.getenv("JWT_SECRET", "signbridge-super-secret-jwt-key-change-in-production-min-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(
    title="GestureX API",
    description="Production-ready two-way Indian Sign Language (ISL) communication platform backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    try:
        init_db()
        print("[GestureX] Database initialized successfully.")
    except Exception as e:
        print(f"[GestureX] Database init error: {e}")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = db.query(User).filter(User.email == email).first()
        return user
    except JWTError:
        return None

# Endpoints

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "GestureX",
        "version": "1.0.0",
        "model_loader": model_loader.get_metadata()
    }

@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    hashed_pw = pwd_context.hash(req.password)
    user = User(name=req.name, email=req.email, hashed_password=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email, "id": user.id, "name": user.name})
    return {
        "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "message": "Account created successfully."
    }

@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": user.email, "id": user.id, "name": user.name})
    return {
        "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "message": "Logged in successfully."
    }

@app.post("/api/auth/logout")
def logout():
    return {"message": "Logged out successfully."}

@app.get("/api/user/profile")
def get_user_profile(current_user: Optional[User] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@app.post("/api/sign-to-conversation", response_model=SignToConversationResponse)
def sign_to_conversation(
    req: SignToConversationRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = isl_service.recognize(
        frames=req.frames,
        min_confidence=req.min_confidence,
        previous_sign=req.previous_sign
    )

    # Persist to conversation history if authenticated and valid sign recognized
    if result.get("recognized") and current_user:
        conv = Conversation(
            user_id=current_user.id,
            mode="sign_to_conversation",
            recognized_sign=result.get("sign"),
            english_caption=result.get("english_caption"),
            telugu_translation=result.get("telugu_translation"),
            confidence=result.get("confidence")
        )
        db.add(conv)
        db.commit()

    return result

@app.post("/api/conversation-to-sign", response_model=ConversationToSignResponse)
def conversation_to_sign(
    req: ConversationToSignRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = text_to_sign_service.process(
        text=req.text,
        source_language=req.source_language,
        speed=req.speed or 1.0
    )

    # Persist to conversation history if authenticated
    if current_user:
        conv = Conversation(
            user_id=current_user.id,
            mode="conversation_to_sign",
            english_caption=result.get("english_text"),
            telugu_translation=result.get("telugu_text"),
            sign_sequence=result.get("isl_sequence"),
            raw_input=req.text
        )
        db.add(conv)
        db.commit()

    return result

@app.post("/api/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    try:
        res = translation_service.translate(req.text, source_lang=req.source_lang, target_lang=req.target_lang)
        return res
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/api/speech-to-text", response_model=SpeechToTextResponse)
def speech_to_text(req: SpeechToTextRequest):
    try:
        res = stt_service.transcribe_audio(req.audio_base64, language=req.language or "en-IN")
        return res
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/api/vocabulary")
def get_vocabulary(category: Optional[str] = None, search: Optional[str] = None):
    items = list(model_loader.vocabulary.values())
    if category and category != "all":
        items = [i for i in items if i.get("category") == category]
    if search:
        s = search.lower()
        items = [
            i for i in items
            if s in i.get("gloss", "").lower() or s in i.get("english", "").lower() or s in i.get("telugu", "")
        ]
    return {
        "count": len(items),
        "total_signs": len(model_loader.vocabulary),
        "signs": items
    }

@app.get("/api/conversations")
def get_conversations(current_user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        # For guest / demo session return recent unassigned or empty list
        return []
    rows = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.timestamp.desc()).limit(50).all()
    return [
        {
            "id": r.id,
            "mode": r.mode,
            "recognized_sign": r.recognized_sign,
            "english_caption": r.english_caption,
            "telugu_translation": r.telugu_translation,
            "confidence": r.confidence,
            "sign_sequence": r.sign_sequence,
            "raw_input": r.raw_input,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None
        }
        for r in rows
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
