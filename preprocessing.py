import base64
import io
import re
from typing import List, Tuple, Optional
from PIL import Image

def clean_base64(data_uri: str) -> str:
    """Strip base64 header like 'data:image/jpeg;base64,' if present."""
    if "," in data_uri:
        return data_uri.split(",", 1)[1]
    return data_uri

def decode_image_frame(b64_str: str) -> Optional[Image.Image]:
    """Decodes a base64 string to a PIL Image."""
    try:
        raw = base64.b64decode(clean_base64(b64_str))
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        return img
    except Exception as e:
        print(f"Error decoding image frame: {e}")
        return None

def preprocess_temporal_frames(frames_b64: List[str], target_size: Tuple[int, int] = (384, 384), max_samples: int = 4) -> List[str]:
    """
    Takes an incoming temporal frame buffer, normalizes resolution and lighting,
    and returns sanitized frames suitable for model inference.
    """
    if not frames_b64:
        return []

    # Sample uniformly across the temporal sequence
    total = len(frames_b64)
    if total <= max_samples:
        indices = list(range(total))
    else:
        step = total / max_samples
        indices = [int(i * step) for i in range(max_samples)]

    processed = []
    for idx in indices:
        raw_b64 = frames_b64[idx]
        img = decode_image_frame(raw_b64)
        if img is None:
            continue
        # Resize preserving clarity for hand and facial articulation
        img.thumbnail(target_size, Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        processed.append(encoded)

    return processed
