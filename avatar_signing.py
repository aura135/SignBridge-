import os
import requests
from typing import List, Dict, Any
from backend.services.model_loader import model_loader

# Standard ISL 3D Anthropomorphic Skeletal Sign Signatures
DEFAULT_SIGN_POSES: Dict[str, Dict[str, Any]] = {
    "HELLO": {
        "duration_ms": 1200,
        "right_hand": { "x": 0.35, "y": 0.82, "z": 0.2, "shape": "open_palm", "fingers": [1, 1, 1, 1, 1], "rot_z": 15 },
        "left_hand": { "x": -0.25, "y": 0.1, "z": 0.0, "shape": "relaxed", "fingers": [0.2, 0.2, 0.2, 0.2, 0.2], "rot_z": 0 },
        "head": { "pitch": 5, "yaw": 0, "roll": 2 },
        "face": { "expression": "warm_smile", "eye_open": 1.0, "mouth": "smile", "eyebrows": "neutral" },
        "description": "Right hand open palm raised near temple, waving gently in salute"
    },
    "THANK YOU": {
        "duration_ms": 1300,
        "right_hand": { "x": 0.0, "y": 0.72, "z": 0.25, "target_z": 0.5, "shape": "flat_b", "fingers": [1, 1, 1, 1, 1], "rot_z": 0 },
        "left_hand": { "x": -0.2, "y": 0.1, "z": 0.0, "shape": "relaxed", "fingers": [0.2, 0.2, 0.2, 0.2, 0.2], "rot_z": 0 },
        "head": { "pitch": -8, "yaw": 0, "roll": 0 },
        "face": { "expression": "grateful_smile", "eye_open": 0.9, "mouth": "gentle_open", "eyebrows": "slightly_raised" },
        "description": "Right flat fingers touch lower lip/chin and sweep outward toward partner"
    },
    "PLEASE": {
        "duration_ms": 1400,
        "right_hand": { "x": 0.05, "y": 0.45, "z": 0.25, "shape": "flat_b", "fingers": [1, 1, 1, 1, 1], "rot_z": -10 },
        "left_hand": { "x": -0.05, "y": 0.45, "z": 0.25, "shape": "flat_b", "fingers": [1, 1, 1, 1, 1], "rot_z": 10 },
        "head": { "pitch": -6, "yaw": 0, "roll": 0 },
        "face": { "expression": "polite_humble", "eye_open": 0.9, "mouth": "closed", "eyebrows": "up" },
        "description": "Both flat hands pressed together in Namaste prayer posture at chest"
    },
    "HOW": {
        "duration_ms": 1100,
        "right_hand": { "x": 0.18, "y": 0.45, "z": 0.3, "shape": "curved_claw", "fingers": [0.6, 0.6, 0.6, 0.6, 0.6], "rot_z": 30 },
        "left_hand": { "x": -0.18, "y": 0.45, "z": 0.3, "shape": "curved_claw", "fingers": [0.6, 0.6, 0.6, 0.6, 0.6], "rot_z": -30 },
        "head": { "pitch": 3, "yaw": 0, "roll": -4 },
        "face": { "expression": "questioning", "eye_open": 0.95, "mouth": "pursed", "eyebrows": "furrowed" },
        "description": "Both curved palms back-to-back roll outward and forward"
    },
    "YOU": {
        "duration_ms": 900,
        "right_hand": { "x": 0.05, "y": 0.5, "z": 0.5, "shape": "point_index", "fingers": [0, 1, 0, 0, 0], "rot_z": 0 },
        "left_hand": { "x": -0.2, "y": 0.1, "z": 0.0, "shape": "relaxed", "fingers": [0.2, 0.2, 0.2, 0.2, 0.2], "rot_z": 0 },
        "head": { "pitch": 2, "yaw": 0, "roll": 0 },
        "face": { "expression": "attentive", "eye_open": 1.0, "mouth": "closed", "eyebrows": "raised" },
        "description": "Right index finger points directly forward toward the conversational partner"
    },
    "FINE": {
        "duration_ms": 1200,
        "right_hand": { "x": 0.02, "y": 0.5, "z": 0.15, "shape": "open_5_thumb_touch", "fingers": [1, 1, 1, 1, 1], "rot_z": 5 },
        "left_hand": { "x": -0.2, "y": 0.1, "z": 0.0, "shape": "relaxed", "fingers": [0.2, 0.2, 0.2, 0.2, 0.2], "rot_z": 0 },
        "head": { "pitch": -4, "yaw": 0, "roll": 0 },
        "face": { "expression": "pleasant_nod", "eye_open": 1.0, "mouth": "smile", "eyebrows": "neutral" },
        "description": "Right open 5-hand thumb repeatedly taps center of chest with a pleasant nod"
    },
    "HELP": {
        "duration_ms": 1300,
        "right_hand": { "x": 0.0, "y": 0.45, "z": 0.3, "shape": "thumb_up_fist", "fingers": [1, 0, 0, 0, 0], "rot_z": 0 },
        "left_hand": { "x": 0.0, "y": 0.38, "z": 0.3, "shape": "flat_b_up", "fingers": [1, 1, 1, 1, 1], "rot_z": 0 },
        "head": { "pitch": -2, "yaw": 0, "roll": 0 },
        "face": { "expression": "concerned_supportive", "eye_open": 1.0, "mouth": "neutral", "eyebrows": "raised" },
        "description": "Right fist with thumb up rested on flat left palm, lifted upward together"
    },
    "WATER": {
        "duration_ms": 1000,
        "right_hand": { "x": 0.05, "y": 0.7, "z": 0.1, "shape": "w_hand", "fingers": [0, 1, 1, 1, 0], "rot_z": 0 },
        "left_hand": { "x": -0.2, "y": 0.1, "z": 0.0, "shape": "relaxed", "fingers": [0.2, 0.2, 0.2, 0.2, 0.2], "rot_z": 0 },
        "head": { "pitch": 0, "yaw": 0, "roll": 0 },
        "face": { "expression": "neutral", "eye_open": 1.0, "mouth": "slightly_open", "eyebrows": "neutral" },
        "description": "Right W-hand (index, middle, ring) taps chin twice"
    },
    "I": {
        "duration_ms": 800,
        "right_hand": { "x": 0.0, "y": 0.48, "z": 0.08, "shape": "point_index", "fingers": [0, 1, 0, 0, 0], "rot_z": 0 },
        "left_hand": { "x": -0.2, "y": 0.1, "z": 0.0, "shape": "relaxed", "fingers": [0.2, 0.2, 0.2, 0.2, 0.2], "rot_z": 0 },
        "head": { "pitch": -3, "yaw": 0, "roll": 0 },
        "face": { "expression": "neutral", "eye_open": 1.0, "mouth": "closed", "eyebrows": "neutral" },
        "description": "Right index finger points inward touching center chest"
    }
}

class AvatarSigningService:
    def __init__(self):
        self.api_url = os.getenv("AVATAR_API_URL")
        self.api_key = os.getenv("AVATAR_API_KEY")

    def generate_animation_timeline(self, isl_sequence: List[str], speed: float = 1.0) -> List[Dict[str, Any]]:
        """
        Generates skeletal coordinate keyframes and facial morph targets for each sign in the ISL sequence.
        """
        if not isl_sequence:
            return []

        # External 3D Avatar signing service check
        if self.api_url:
            try:
                headers = {"Content-Type": "application/json"}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"
                resp = requests.post(self.api_url, json={"sequence": isl_sequence, "speed": speed}, headers=headers, timeout=4)
                if resp.status_code == 200:
                    return resp.json().get("timeline", [])
            except Exception as e:
                print(f"[AvatarSigningService] External avatar API error: {e}")

        timeline = []
        speed_factor = max(0.25, min(3.0, speed))

        for sign_name in isl_sequence:
            upper_sign = sign_name.upper().strip()
            pose_data = DEFAULT_SIGN_POSES.get(upper_sign)

            if not pose_data:
                # Dynamic procedural pose from vocabulary metadata
                vocab_item = model_loader.get_sign_details(upper_sign)
                desc = vocab_item.get("movement") or vocab_item.get("handshape") if vocab_item else f"Sign for {upper_sign}"
                pose_data = {
                    "duration_ms": 1100,
                    "right_hand": { "x": 0.15, "y": 0.55, "z": 0.25, "shape": "open_5", "fingers": [0.8, 0.8, 0.8, 0.8, 0.8], "rot_z": 10 },
                    "left_hand": { "x": -0.15, "y": 0.5, "z": 0.2, "shape": "open_5", "fingers": [0.5, 0.5, 0.5, 0.5, 0.5], "rot_z": -10 },
                    "head": { "pitch": 0, "yaw": 0, "roll": 0 },
                    "face": { "expression": "focused", "eye_open": 1.0, "mouth": "closed", "eyebrows": "slightly_raised" },
                    "description": desc
                }

            adjusted_duration = int(pose_data["duration_ms"] / speed_factor)

            keyframe = {
                "sign": upper_sign,
                "duration_ms": adjusted_duration,
                "right_hand": pose_data["right_hand"],
                "left_hand": pose_data["left_hand"],
                "head": pose_data["head"],
                "face": pose_data["face"],
                "description": pose_data["description"]
            }
            timeline.append(keyframe)

        return timeline

avatar_service = AvatarSigningService()
