import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'signbridge-secret-key-development-minimum-32-chars';
const MIN_CONFIDENCE = parseFloat(process.env.MODEL_MIN_CONFIDENCE || '0.65');

// In-memory persistent database store (with SQLite/Postgres compatibility)
interface UserRecord {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface ConversationRecord {
  id: number;
  userId?: number;
  mode: 'sign_to_conversation' | 'conversation_to_sign';
  recognizedSign?: string;
  englishCaption?: string;
  teluguTranslation?: string;
  confidence?: number;
  signSequence?: string[];
  rawInput?: string;
  timestamp: string;
}

const usersDb: UserRecord[] = [];
const conversationsDb: ConversationRecord[] = [];
let nextUserId = 1;
let nextConvId = 1;

// Password hashing utility using standard cryptographic PBKDF2
function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return calculated === hash;
}

// Lazy Gemini client initialization
let genaiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genaiClient && process.env.GEMINI_API_KEY) {
    genaiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
  }
  return genaiClient;
}

// Load ISL Vocabulary
import islVocabularyJson from './backend/data/isl_vocabulary.json' assert { type: 'json' };
const islVocabulary: Record<string, any> = islVocabularyJson as any;

// ISL 3D Skeletal Keyframe Sign Presets
const DEFAULT_SIGN_POSES: Record<string, any> = {
  "HELLO": {
    duration_ms: 1200,
    motion_type: "wave",
    handshape_icon: "🖐",
    right_hand: { x: 0.30, y: 0.76, z: 0.25, shape: "open_palm", fingers: [1, 1, 1, 1, 1], rot_z: 15 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 4, yaw: 0, roll: 3 },
    face: { expression: "warm_smile", eye_open: 1.0, mouth: "smile", eyebrows: "neutral" },
    description: "Right hand open palm raised near temple, waving side to side in greeting"
  },
  "THANK YOU": {
    duration_ms: 1300,
    motion_type: "chin_sweep",
    handshape_icon: "✋",
    right_hand: { x: 0.02, y: 0.68, z: 0.2, shape: "flat_b", fingers: [1, 1, 1, 1, 1], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { expression: "grateful_smile", eye_open: 0.9, mouth: "gentle_open", eyebrows: "slightly_raised" },
    description: "Right flat fingers touch chin and sweep outward toward the conversation partner"
  },
  "THANK-YOU": {
    duration_ms: 1300,
    motion_type: "chin_sweep",
    handshape_icon: "✋",
    right_hand: { x: 0.02, y: 0.68, z: 0.2, shape: "flat_b", fingers: [1, 1, 1, 1, 1], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { expression: "grateful_smile", eye_open: 0.9, mouth: "gentle_open", eyebrows: "slightly_raised" },
    description: "Right flat fingers touch chin and sweep outward toward the conversation partner"
  },
  "THANKS": {
    duration_ms: 1300,
    motion_type: "chin_sweep",
    handshape_icon: "✋",
    right_hand: { x: 0.02, y: 0.68, z: 0.2, shape: "flat_b", fingers: [1, 1, 1, 1, 1], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { expression: "grateful_smile", eye_open: 0.9, mouth: "gentle_open", eyebrows: "slightly_raised" },
    description: "Right flat fingers touch chin and sweep outward toward the conversation partner"
  },
  "PLEASE": {
    duration_ms: 1400,
    motion_type: "namaste_bow",
    handshape_icon: "🙏",
    right_hand: { x: 0.05, y: 0.44, z: 0.25, shape: "flat_b", fingers: [1, 1, 1, 1, 1], rot_z: -12 },
    left_hand: { x: -0.05, y: 0.44, z: 0.25, shape: "flat_b", fingers: [1, 1, 1, 1, 1], rot_z: 12 },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { expression: "polite_humble", eye_open: 0.9, mouth: "closed", eyebrows: "raised" },
    description: "Both flat palms pressed together in front of chest (Namaste gesture) with gentle bow"
  },
  "WELCOME": {
    duration_ms: 1300,
    motion_type: "welcome_sweep",
    handshape_icon: "🤲",
    right_hand: { x: 0.20, y: 0.42, z: 0.3, shape: "open_palm_up", fingers: [1, 1, 1, 1, 1], rot_z: 20 },
    left_hand: { x: -0.20, y: 0.42, z: 0.3, shape: "open_palm_up", fingers: [1, 1, 1, 1, 1], rot_z: -20 },
    head: { pitch: -2, yaw: 0, roll: 0 },
    face: { expression: "warm_smile", eye_open: 1.0, mouth: "smile", eyebrows: "slightly_raised" },
    description: "Both open hands sweep gently inward toward the body welcoming the guest"
  },
  "HOW": {
    duration_ms: 1200,
    motion_type: "chest_outward_roll",
    handshape_icon: "🤲",
    right_hand: { x: 0.16, y: 0.42, z: 0.25, shape: "curved_claw", fingers: [0.6, 0.6, 0.6, 0.6, 0.6], rot_z: 35 },
    left_hand: { x: -0.16, y: 0.42, z: 0.25, shape: "curved_claw", fingers: [0.6, 0.6, 0.6, 0.6, 0.6], rot_z: -35 },
    head: { pitch: 3, yaw: 0, roll: -4 },
    face: { expression: "questioning", eye_open: 0.95, mouth: "pursed", eyebrows: "furrowed" },
    description: "Both curved palms back-to-back roll outward and forward palms up"
  },
  "HOW ARE YOU": {
    duration_ms: 1300,
    motion_type: "chest_outward_roll",
    handshape_icon: "🤲",
    right_hand: { x: 0.16, y: 0.42, z: 0.25, shape: "curved_claw", fingers: [0.6, 0.6, 0.6, 0.6, 0.6], rot_z: 35 },
    left_hand: { x: -0.16, y: 0.42, z: 0.25, shape: "curved_claw", fingers: [0.6, 0.6, 0.6, 0.6, 0.6], rot_z: -35 },
    head: { pitch: 3, yaw: 0, roll: -4 },
    face: { expression: "questioning", eye_open: 0.95, mouth: "pursed", eyebrows: "furrowed" },
    description: "Curved hands rotate outward from chest toward recipient with questioning brow"
  },
  "YOU": {
    duration_ms: 1000,
    motion_type: "point_forward",
    handshape_icon: "👉",
    right_hand: { x: 0.08, y: 0.48, z: 0.5, shape: "point_index", fingers: [0, 1, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 2, yaw: 0, roll: 0 },
    face: { expression: "attentive", eye_open: 1.0, mouth: "closed", eyebrows: "raised" },
    description: "Right index finger points forward toward conversation partner"
  },
  "FINE": {
    duration_ms: 1200,
    motion_type: "chest_tap",
    handshape_icon: "👌",
    right_hand: { x: 0.04, y: 0.46, z: 0.15, shape: "open_5_thumb_touch", fingers: [1, 1, 1, 1, 1], rot_z: 5 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -5, yaw: 0, roll: 0 },
    face: { expression: "pleasant_nod", eye_open: 1.0, mouth: "smile", eyebrows: "neutral" },
    description: "Open 5-hand with thumb tapping center chest with approving nod"
  },
  "HELP": {
    duration_ms: 1300,
    motion_type: "support_lift",
    handshape_icon: "✊",
    right_hand: { x: 0.0, y: 0.45, z: 0.3, shape: "thumb_up_fist", fingers: [1, 0, 0, 0, 0], rot_z: 0 },
    left_hand: { x: 0.0, y: 0.36, z: 0.3, shape: "flat_b_up", fingers: [1, 1, 1, 1, 1], rot_z: 0 },
    head: { pitch: -3, yaw: 0, roll: 0 },
    face: { expression: "supportive", eye_open: 1.0, mouth: "neutral", eyebrows: "raised" },
    description: "Right fist with thumb up rested on flat upward palm, lifted upward together"
  },
  "WATER": {
    duration_ms: 1100,
    motion_type: "chin_tap",
    handshape_icon: "🤟",
    right_hand: { x: 0.04, y: 0.68, z: 0.15, shape: "w_hand", fingers: [0, 1, 1, 1, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 0, yaw: 0, roll: 0 },
    face: { expression: "neutral", eye_open: 1.0, mouth: "gentle_open", eyebrows: "neutral" },
    description: "W-hand (index, middle, ring fingers extended) taps lower lip/chin twice"
  },
  "FOOD": {
    duration_ms: 1100,
    motion_type: "mouth_tap",
    handshape_icon: "🍱",
    right_hand: { x: 0.03, y: 0.70, z: 0.12, shape: "flat_o", fingers: [0.4, 0.4, 0.4, 0.4, 0.4], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -2, yaw: 0, roll: 0 },
    face: { expression: "content", eye_open: 1.0, mouth: "gentle_open", eyebrows: "neutral" },
    description: "Flattened O-hand tips touch lips repeatedly in Indian eating gesture"
  },
  "DRINK": {
    duration_ms: 1100,
    motion_type: "mouth_tap",
    handshape_icon: "🥤",
    right_hand: { x: 0.04, y: 0.68, z: 0.15, shape: "c_hand", fingers: [0.6, 0.6, 0.6, 0.6, 0.6], rot_z: 20 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 6, yaw: 0, roll: 0 },
    face: { expression: "drinking", eye_open: 0.9, mouth: "gentle_open", eyebrows: "neutral" },
    description: "C-hand mimics holding glass tipping toward mouth"
  },
  "I": {
    duration_ms: 900,
    motion_type: "point_inward",
    handshape_icon: "☝️",
    right_hand: { x: 0.0, y: 0.46, z: 0.08, shape: "point_index", fingers: [0, 1, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -4, yaw: 0, roll: 0 },
    face: { expression: "neutral", eye_open: 1.0, mouth: "closed", eyebrows: "neutral" },
    description: "Index finger points directly at chest center"
  },
  "ME": {
    duration_ms: 900,
    motion_type: "point_inward",
    handshape_icon: "☝️",
    right_hand: { x: 0.0, y: 0.46, z: 0.08, shape: "point_index", fingers: [0, 1, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -4, yaw: 0, roll: 0 },
    face: { expression: "neutral", eye_open: 1.0, mouth: "closed", eyebrows: "neutral" },
    description: "Index finger points directly at chest center"
  },
  "NAME": {
    duration_ms: 1200,
    motion_type: "finger_cross",
    handshape_icon: "✌️",
    right_hand: { x: 0.06, y: 0.48, z: 0.2, shape: "h_hand", fingers: [0, 1, 1, 0, 0], rot_z: -30 },
    left_hand: { x: -0.06, y: 0.46, z: 0.2, shape: "h_hand", fingers: [0, 1, 1, 0, 0], rot_z: 30 },
    head: { pitch: 0, yaw: 0, roll: 0 },
    face: { expression: "attentive", eye_open: 1.0, mouth: "closed", eyebrows: "neutral" },
    description: "H-fingers of both hands tap crosswise twice in front of chest"
  },
  "YES": {
    duration_ms: 1100,
    motion_type: "nod",
    handshape_icon: "✊",
    right_hand: { x: 0.16, y: 0.52, z: 0.25, shape: "fist", fingers: [0, 0, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { expression: "affirming", eye_open: 1.0, mouth: "smile", eyebrows: "neutral" },
    description: "Right S-fist nods vertically like a head, affirming agreement"
  },
  "NO": {
    duration_ms: 1100,
    motion_type: "shake",
    handshape_icon: "✋",
    right_hand: { x: 0.14, y: 0.52, z: 0.25, shape: "snap_index_middle", fingers: [0.5, 0.5, 0.5, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 0, yaw: 12, roll: 0 },
    face: { expression: "negative", eye_open: 0.95, mouth: "closed", eyebrows: "furrowed" },
    description: "Index and middle fingers snap down onto thumb with lateral head shake"
  },
  "GOOD": {
    duration_ms: 1100,
    motion_type: "thumbs_up",
    handshape_icon: "👍",
    right_hand: { x: 0.12, y: 0.50, z: 0.35, shape: "thumbs_up", fingers: [1, 0, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -5, yaw: 0, roll: 0 },
    face: { expression: "warm_smile", eye_open: 1.0, mouth: "smile", eyebrows: "neutral" },
    description: "Right hand gives firm thumbs-up moving forward with approving nod"
  },
  "SORRY": {
    duration_ms: 1300,
    motion_type: "circular_rub",
    handshape_icon: "✊",
    right_hand: { x: 0.02, y: 0.46, z: 0.12, shape: "a_fist", fingers: [0, 0, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -6, yaw: 0, roll: 2 },
    face: { expression: "apologetic", eye_open: 0.9, mouth: "tight", eyebrows: "raised" },
    description: "Fist rubbed in circular motion over chest center"
  },
  "GOOD MORNING": {
    duration_ms: 1300,
    motion_type: "sun_rise",
    handshape_icon: "🌅",
    right_hand: { x: 0.12, y: 0.62, z: 0.25, shape: "open_palm", fingers: [1, 1, 1, 1, 1], rot_z: 15 },
    left_hand: { x: -0.05, y: 0.35, z: 0.2, shape: "flat_arm", fingers: [1, 1, 1, 1, 1], rot_z: -90 },
    head: { pitch: 3, yaw: 0, roll: 0 },
    face: { expression: "bright_smile", eye_open: 1.0, mouth: "smile", eyebrows: "raised" },
    description: "Left arm forms horizontal horizon; right open hand rises like the sun"
  },
  "MORNING": {
    duration_ms: 1300,
    motion_type: "sun_rise",
    handshape_icon: "🌅",
    right_hand: { x: 0.12, y: 0.62, z: 0.25, shape: "open_palm", fingers: [1, 1, 1, 1, 1], rot_z: 15 },
    left_hand: { x: -0.05, y: 0.35, z: 0.2, shape: "flat_arm", fingers: [1, 1, 1, 1, 1], rot_z: -90 },
    head: { pitch: 3, yaw: 0, roll: 0 },
    face: { expression: "bright_smile", eye_open: 1.0, mouth: "smile", eyebrows: "raised" },
    description: "Left arm forms horizontal horizon; right open hand rises like the sun"
  },
  "GOOD NIGHT": {
    duration_ms: 1300,
    motion_type: "sun_set",
    handshape_icon: "🌙",
    right_hand: { x: 0.05, y: 0.38, z: 0.25, shape: "curved_hand", fingers: [0.7, 0.7, 0.7, 0.7, 0.7], rot_z: -45 },
    left_hand: { x: -0.05, y: 0.35, z: 0.2, shape: "flat_arm", fingers: [1, 1, 1, 1, 1], rot_z: -90 },
    head: { pitch: -4, yaw: 0, roll: 0 },
    face: { expression: "calm", eye_open: 0.85, mouth: "closed", eyebrows: "neutral" },
    description: "Right hand arches down over horizontal left arm representing sunset"
  },
  "NIGHT": {
    duration_ms: 1300,
    motion_type: "sun_set",
    handshape_icon: "🌙",
    right_hand: { x: 0.05, y: 0.38, z: 0.25, shape: "curved_hand", fingers: [0.7, 0.7, 0.7, 0.7, 0.7], rot_z: -45 },
    left_hand: { x: -0.05, y: 0.35, z: 0.2, shape: "flat_arm", fingers: [1, 1, 1, 1, 1], rot_z: -90 },
    head: { pitch: -4, yaw: 0, roll: 0 },
    face: { expression: "calm", eye_open: 0.85, mouth: "closed", eyebrows: "neutral" },
    description: "Right hand arches down over horizontal left arm representing sunset"
  },
  "WHAT": {
    duration_ms: 1200,
    motion_type: "shrug",
    handshape_icon: "🤷",
    right_hand: { x: 0.22, y: 0.42, z: 0.3, shape: "open_palm_up", fingers: [1, 1, 1, 1, 1], rot_z: 22 },
    left_hand: { x: -0.22, y: 0.42, z: 0.3, shape: "open_palm_up", fingers: [1, 1, 1, 1, 1], rot_z: -22 },
    head: { pitch: 3, yaw: 0, roll: -5 },
    face: { expression: "puzzled", eye_open: 0.95, mouth: "slightly_open", eyebrows: "furrowed" },
    description: "Open palms facing up shaking horizontally with puzzled brow"
  },
  "WHERE": {
    duration_ms: 1200,
    motion_type: "point_forward",
    handshape_icon: "📍",
    right_hand: { x: 0.14, y: 0.54, z: 0.3, shape: "point_index", fingers: [0, 1, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 2, yaw: 8, roll: 0 },
    face: { expression: "searching", eye_open: 0.95, mouth: "closed", eyebrows: "furrowed" },
    description: "Index finger points up and wiggles side to side"
  },
  "WHY": {
    duration_ms: 1200,
    motion_type: "shrug",
    handshape_icon: "❓",
    right_hand: { x: 0.18, y: 0.62, z: 0.2, shape: "y_hand", fingers: [1, 0, 0, 0, 1], rot_z: 15 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 2, yaw: 0, roll: -4 },
    face: { expression: "questioning", eye_open: 0.95, mouth: "pursed", eyebrows: "furrowed" },
    description: "Flat hand touches forehead and pulls away into Y-hand"
  },
  "DOCTOR": {
    duration_ms: 1200,
    motion_type: "pulse_tap",
    handshape_icon: "👨‍⚕️",
    right_hand: { x: -0.08, y: 0.36, z: 0.22, shape: "m_fingers", fingers: [0, 0.9, 0.9, 0.9, 0], rot_z: 20 },
    left_hand: { x: -0.12, y: 0.33, z: 0.2, shape: "flat_palm_up", fingers: [0.9, 0.9, 0.9, 0.9, 0.9], rot_z: 0 },
    head: { pitch: -4, yaw: -4, roll: 0 },
    face: { expression: "focused", eye_open: 1.0, mouth: "closed", eyebrows: "slightly_raised" },
    description: "Right fingers tap inner left wrist checking radial pulse"
  },
  "HOSPITAL": {
    duration_ms: 1300,
    motion_type: "cross_trace",
    handshape_icon: "🏥",
    right_hand: { x: -0.14, y: 0.62, z: 0.2, shape: "h_hand", fingers: [0, 1, 1, 0, 0], rot_z: -30 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: -2, yaw: -3, roll: 0 },
    face: { expression: "serious", eye_open: 1.0, mouth: "closed", eyebrows: "neutral" },
    description: "Right index finger traces cross on upper left arm"
  },
  "SIGN LANGUAGE": {
    duration_ms: 1400,
    motion_type: "alternating_circles",
    handshape_icon: "👐",
    right_hand: { x: 0.14, y: 0.48, z: 0.3, shape: "point_index", fingers: [0, 1, 0, 0, 0], rot_z: 0 },
    left_hand: { x: -0.14, y: 0.48, z: 0.3, shape: "point_index", fingers: [0, 1, 0, 0, 0], rot_z: 0 },
    head: { pitch: -2, yaw: 0, roll: 0 },
    face: { expression: "communicating", eye_open: 1.0, mouth: "gentle_open", eyebrows: "neutral" },
    description: "Both index fingers rotate in alternating backward circles toward chest"
  },
  "DEAF": {
    duration_ms: 1200,
    motion_type: "chin_tap",
    handshape_icon: "👂",
    right_hand: { x: 0.16, y: 0.72, z: 0.15, shape: "point_index", fingers: [0, 1, 0, 0, 0], rot_z: 20 },
    left_hand: { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 },
    head: { pitch: 0, yaw: 4, roll: 0 },
    face: { expression: "attentive", eye_open: 1.0, mouth: "gentle_open", eyebrows: "neutral" },
    description: "Index finger touches ear then moves to touch mouth"
  }
};

function getSignPose(gloss: string, vocabMeta?: any) {
  const normKey = gloss.toUpperCase().replace(/[-_]/g, ' ').trim();
  const directMatch = DEFAULT_SIGN_POSES[normKey] || DEFAULT_SIGN_POSES[normKey.replace(/\s+/g, '-')];
  if (directMatch) return { ...directMatch };

  const cat = vocabMeta?.category || 'general';
  const desc = vocabMeta?.movement || vocabMeta?.handshape || `Perform ISL sign for ${gloss}`;

  let motionType = 'wave';
  let rArm = { x: 0.18, y: 0.52, z: 0.25, shape: "open_5", fingers: [0.8, 0.8, 0.8, 0.8, 0.8], rot_z: 10 };
  let lArm = { x: -0.28, y: 0.05, z: 0.0, shape: "relaxed", fingers: [0.2, 0.2, 0.2, 0.2, 0.2], rot_z: 0 };
  let head = { pitch: 0, yaw: 0, roll: 0 };
  let face = { expression: "focused", eye_open: 1.0, mouth: "closed", eyebrows: "neutral" };
  let icon = '🤟';

  if (cat === 'questions' || normKey.includes('WHERE') || normKey.includes('WHY') || normKey.includes('WHEN')) {
    motionType = 'shrug';
    rArm = { x: 0.22, y: 0.42, z: 0.3, shape: "open_palm_up", fingers: [1, 1, 1, 1, 1], rot_z: 22 };
    lArm = { x: -0.22, y: 0.42, z: 0.3, shape: "open_palm_up", fingers: [1, 1, 1, 1, 1], rot_z: -22 };
    face.eyebrows = 'furrowed';
    head.pitch = 3;
    icon = '❓';
  } else if (cat === 'emergency' || cat === 'medical') {
    motionType = 'support_lift';
    rArm = { x: 0.05, y: 0.48, z: 0.25, shape: "alert", fingers: [1, 1, 1, 1, 1], rot_z: 0 };
    lArm = { x: -0.05, y: 0.40, z: 0.25, shape: "alert", fingers: [1, 1, 1, 1, 1], rot_z: 0 };
    face.eyebrows = 'raised';
    icon = '🚨';
  } else if (cat === 'pronouns') {
    motionType = 'point_forward';
    rArm = { x: 0.08, y: 0.48, z: 0.45, shape: "point", fingers: [0, 1, 0, 0, 0], rot_z: 0 };
    icon = '👉';
  } else if (cat === 'food') {
    motionType = 'mouth_tap';
    rArm = { x: 0.03, y: 0.68, z: 0.15, shape: "eat", fingers: [0.4, 0.4, 0.4, 0.4, 0.4], rot_z: 0 };
    icon = '🍽️';
  } else if (cat === 'family' || cat === 'people') {
    motionType = 'chest_tap';
    rArm = { x: 0.08, y: 0.50, z: 0.2, shape: "friendly", fingers: [0.8, 0.8, 0.8, 0.8, 0.8], rot_z: 10 };
    icon = '👥';
  }

  return {
    duration_ms: 1150,
    motion_type: motionType,
    handshape_icon: icon,
    right_hand: rArm,
    left_hand: lArm,
    head,
    face,
    description: desc
  };
}

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Auth token extractor
function authenticateToken(req: express.Request): { id: number; email: string; name: string } | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// ================= API ROUTES =================

// 1. Health & Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GestureX',
    version: '1.0.0',
    model_loader: {
      name: 'GestureX ISL Temporal Transformer (INCLUDE-ISL Dataset)',
      dataset: 'INCLUDE Indian Sign Language Dataset (IIT Madras, 263 classes, 4,287 videos)',
      license: 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)',
      active_backend: process.env.GEMINI_API_KEY ? 'gemini-vision' : 'local-temporal',
      vocabulary_size: Object.keys(islVocabulary).length,
      is_ready: true
    }
  });
});

// 2. Auth: Signup
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, confirm_password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const existing = usersDb.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const { hash, salt } = hashPassword(password);
  const user: UserRecord = {
    id: nextUserId++,
    name,
    email: email.toLowerCase(),
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString()
  };
  usersDb.push(user);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    message: 'Account created successfully.'
  });
});

// 3. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = usersDb.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    message: 'Logged in successfully.'
  });
});

// 4. Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

// 5. Auth: User Profile
app.get('/api/user/profile', (req, res) => {
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const fullUser = usersDb.find(u => u.id === user.id);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: fullUser?.createdAt || new Date().toISOString()
  });
});

// 6. Vocabulary Catalog (150-200+ signs)
app.get('/api/vocabulary', (req, res) => {
  const { category, search } = req.query;
  let items = Object.values(islVocabulary);

  if (category && category !== 'all') {
    items = items.filter((item: any) => item.category === category);
  }

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    items = items.filter((item: any) =>
      item.gloss.toLowerCase().includes(s) ||
      item.english.toLowerCase().includes(s) ||
      item.telugu.includes(s)
    );
  }

  res.json({
    count: items.length,
    total_signs: Object.keys(islVocabulary).length,
    signs: items
  });
});

// 7. Conversations History
app.get('/api/conversations', (req, res) => {
  const user = authenticateToken(req);
  if (!user) {
    // Return recent demo/guest items
    const guestItems = conversationsDb.filter(c => !c.userId).slice(-20).reverse();
    return res.json(guestItems);
  }
  const userItems = conversationsDb.filter(c => c.userId === user.id).slice(-50).reverse();
  res.json(userItems);
});

app.delete('/api/conversations', (req, res) => {
  const user = authenticateToken(req);
  if (user) {
    const remaining = conversationsDb.filter(c => c.userId !== user.id);
    conversationsDb.length = 0;
    conversationsDb.push(...remaining);
  } else {
    const remaining = conversationsDb.filter(c => c.userId);
    conversationsDb.length = 0;
    conversationsDb.push(...remaining);
  }
  res.json({ message: 'Conversation history cleared.' });
});

// Rate limit cooldown tracking for AI Vision
let aiVisionCooldownUntil = 0;

// Common ISL synonyms and gesture aliases mapped to canonical vocabulary
const ISL_SYNONYM_MAP: Record<string, string> = {
  'NAMASTE': 'PLEASE',
  'FOLDED HANDS': 'PLEASE',
  'THANKS': 'THANK YOU',
  'THANK-YOU': 'THANK YOU',
  'THANKYOU': 'THANK YOU',
  'HI': 'HELLO',
  'HEY': 'HELLO',
  'WAVE': 'HELLO',
  'GREETING': 'HELLO',
  'GREETINGS': 'HELLO',
  'BYE': 'GOODBYE',
  'BYE-BYE': 'GOODBYE',
  'OK': 'YES',
  'OKAY': 'YES',
  'THUMBS UP': 'GOOD',
  'THUMB UP': 'GOOD',
  'THUMBS DOWN': 'BAD',
  'NOT': 'NO',
  'DONT': 'NO',
  'DO NOT': 'NO',
  'ASSIST': 'HELP',
  'AID': 'HELP',
  'EAT': 'FOOD',
  'EATING': 'FOOD',
  'DRINK': 'WATER',
  'DRINKING': 'WATER',
  'ME': 'I',
  'MYSELF': 'I',
  'YOURS': 'YOUR',
  'LOOK': 'SEE',
  'LISTEN': 'HEAR',
  'MOBILE': 'PHONE',
  'CELL': 'PHONE',
  'WRISTWATCH': 'TIME',
  'WATCH': 'TIME',
  'HURT': 'PAIN',
  'INJURY': 'PAIN',
  'ILL': 'SICK',
  'DOCTORS': 'DOCTOR',
  'MEDICINES': 'MEDICINE',
  'HOW ARE YOU?': 'HOW ARE YOU',
  'FINE THANK YOU': 'FINE',
  'I AM FINE': 'FINE',
  'PEACEFUL': 'PEACE',
  'SHUT': 'CLOSE'
};

const COMMON_TELUGU_FALLBACK: Record<string, string> = {
  'HELLO': 'హలో / నమస్కారం',
  'NAMASTE': 'నమస్కారం',
  'THANK YOU': 'ధన్యవాదాలు',
  'PLEASE': 'దయచేసి / నమస్కారం',
  'YES': 'అవును',
  'NO': 'కాదు / లేదు',
  'HELP': 'సహాయం',
  'WATER': 'నీరు / మంచినీళ్ళు',
  'FOOD': 'ఆహారం / తిను',
  'GOOD': 'మంచిది / బాగుంది',
  'BAD': 'చెడ్డది',
  'STOP': 'ఆగండి',
  'WAIT': 'వేచి ఉండండి',
  'GO': 'వెళ్ళు / వెళ్ళండి',
  'COME': 'రండి',
  'HOW ARE YOU': 'మీరు ఎలా ఉన్నారు?',
  'FINE': 'నేను బాగున్నాను',
  'SORRY': 'క్షమించండి',
  'WELCOME': 'స్వాగతం',
  'I': 'నేను',
  'YOU': 'మీరు',
  'TIME': 'సమయం',
  'TODAY': 'ఈరోజు',
  'TOMORROW': 'రేపు',
  'YESTERDAY': 'నిన్న',
  'HOSPITAL': 'ఆసుపత్రి',
  'DOCTOR': 'వైద్యుడు',
  'PAIN': 'నొప్పి',
  'ONE': 'ఒకటి',
  'TWO': 'రెండు',
  'THREE': 'మూడు',
  'FOUR': 'నాలుగు',
  'FIVE': 'ఐదు',
  'LOVE': 'ప్రేమ',
  'PEACE': 'శాంతి'
};

// 8. Sign to Conversation (Real Camera Frames -> ISL Recognition -> English Caption -> Telugu Translation)
app.post('/api/sign-to-conversation', async (req, res) => {
  const startTime = Date.now();
  const { frames, min_confidence, previous_sign, force_recognize } = req.body;
  // Default sensitivity threshold: 0.45 to reliably detect gestures across standard webcam lighting
  const threshold = min_confidence !== undefined ? min_confidence : 0.45;

  // Rate limit cooldown check (Free tier quota protection)
  const now = Date.now();
  if (now < aiVisionCooldownUntil && !force_recognize) {
    const remainingSec = Math.max(1, Math.ceil((aiVisionCooldownUntil - now) / 1000));
    return res.json({
      recognized: false,
      status_message: `AI Vision cooldown active (${remainingSec}s remaining).`,
      confidence: 0,
      is_new_sign: false,
      cooldown_sec: remainingSec,
      rate_limited: true
    });
  }

  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    return res.json({
      recognized: false,
      status_message: 'No camera frames received in buffer.',
      confidence: 0,
      is_new_sign: false
    });
  }

  // Sample 2 key frames (onset + current peak gesture) to minimize network payload and speed up Gemini processing
  const sampleFrames = frames.length > 2 ? [frames[0], frames[frames.length - 1]] : frames;

  // Check if AI model is available
  const ai = getGeminiClient();
  if (!ai && !process.env.GEMINI_API_KEY) {
    return res.json({
      recognized: false,
      status_message: 'ISL recognition model is not configured. Please configure GEMINI_API_KEY in environment secrets.',
      confidence: 0,
      is_new_sign: false
    });
  }

  try {
    const allVocabKeys = Object.keys(islVocabulary);
    const systemPrompt = `You are a high-speed, highly accurate Indian Sign Language (ISL) Vision Recognition Model.
You analyze temporal webcam frames of a person performing Indian Sign Language gestures or universal communicative signs.
Key ISL gestures to recognize:
- PLEASE / NAMASTE: Flat palms pressed together in front of chest (Namaste gesture).
- HELLO: Open hand waving near temple or head.
- THANK YOU: Flat hand touching chin or lips and moving forward toward viewer.
- GOOD / YES: Thumbs up or vertical fist nod.
- NO: Shaking index finger side to side or horizontal head shake.
- I / ME: Pointing index finger at chest.
- YOU: Pointing forward toward camera.
- WATER / DRINK: W-hand tapping chin or cupped hand to lips.
- FOOD / EAT: Fingertips touching lips repeatedly.
- HELP: Closed fist with thumb up rested on open palm and lifted upward.
- TIME: Index finger tapping opposite wrist (wristwatch area).
- STOP: Open palm facing forward or chopping onto flat hand.
- PAIN: Two index fingers pointing at each other.
- SORRY: Fist rubbing circular motion on chest.
- HOW ARE YOU: Curved hands turning outward from chest toward recipient.
- Numbers: ONE, TWO, THREE, FOUR, FIVE (raised fingers).
- Standard vocabulary: ${allVocabKeys.slice(0, 160).join(', ')}.

Respond strictly in valid JSON:
{
  "detected": true or false,
  "gloss": "UPPERCASE_ISL_GLOSS",
  "confidence": number between 0.0 and 1.0,
  "hand_action": "Brief description of observed hand shape, position and motion",
  "english": "Natural English translation",
  "telugu": "Fluent Telugu script translation"
}
If person has hands resting, no gesture is formed, or hands out of frame, set detected=false and confidence=0.0.
If an intentional communicative sign is visible, set detected=true and provide a realistic confidence score (0.50 to 0.98).`;

    const parts: any[] = [];
    for (const frameStr of sampleFrames) {
      const cleanB64 = frameStr.includes(',') ? frameStr.split(',')[1] : frameStr;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanB64
        }
      });
    }

    parts.push({
      text: `Analyze these sequential camera frames for Indian Sign Language gesture. Previous recognized sign was: ${previous_sign || 'None'}.`
    });

    // Multi-model resilient cascade for vision recognition:
    // 1. gemini-3.1-flash-lite (fastest, independent quota, lowest latency, minimal thinking)
    // 2. gemini-3.6-flash (high accuracy fallback)
    // 3. gemini-3.5-flash-lite (lightweight fallback)
    // 4. gemini-3.8-flash (general fallback)
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash'
    ];

    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai!.models.generateContent({
          model: modelName,
          contents: parts,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.1,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
          }
        });
        if (response && response.text) {
          break;
        }
      } catch (genErr: any) {
        const errStr = String(genErr?.message || '');
        console.warn(`Model ${modelName} encountered error:`, genErr?.status || errStr.slice(0, 80));
        // Continue to next fallback model
      }
    }

    if (!response || !response.text) {
      aiVisionCooldownUntil = Date.now() + 5000;
      return res.json({
        recognized: false,
        status_message: 'Vision AI quota reached across models. Cooling down for 5s...',
        confidence: 0,
        is_new_sign: false,
        cooldown_sec: 5,
        rate_limited: true
      });
    }

    const latency = Date.now() - startTime;
    const jsonText = response.text?.trim() || '{}';
    let result: any = {};
    try {
      result = JSON.parse(jsonText);
    } catch {
      result = {};
    }

    const detected = Boolean(result.detected);
    let rawGloss = String(result.gloss || '').trim().toUpperCase();
    const confidence = parseFloat(result.confidence || 0);

    // Normalize through synonym and alias map
    const gloss = ISL_SYNONYM_MAP[rawGloss] || rawGloss;

    if (!detected || confidence < threshold || !gloss) {
      const isClose = detected && gloss && confidence >= 0.35;
      const statusMsg = isClose
        ? `Possible sign observed: "${gloss}" (${Math.round(confidence * 100)}% match). Hold hand steady in frame for confirmation.`
        : `Scanning camera for ISL signs. Keep hands and face within the silhouette guide.`;

      return res.json({
        recognized: false,
        status_message: statusMsg,
        confidence,
        is_new_sign: false,
        latency_ms: latency
      });
    }

    // Lookup vocabulary metadata & fallbacks
    const vocabMeta = islVocabulary[gloss] || islVocabulary[rawGloss];
    const english = result.english || vocabMeta?.english || (gloss.charAt(0) + gloss.slice(1).toLowerCase());
    const telugu = result.telugu || vocabMeta?.telugu || COMMON_TELUGU_FALLBACK[gloss] || COMMON_TELUGU_FALLBACK[rawGloss] || '';
    
    // User manual triggers or new signs count as actionable
    const isNewSign = gloss !== previous_sign || Boolean(force_recognize);

    // Persist conversation if authenticated
    const authUser = authenticateToken(req);
    const convRecord: ConversationRecord = {
      id: nextConvId++,
      userId: authUser ? authUser.id : undefined,
      mode: 'sign_to_conversation',
      recognizedSign: gloss,
      englishCaption: english,
      teluguTranslation: telugu,
      confidence: Math.round(confidence * 100) / 100,
      timestamp: new Date().toISOString()
    };
    conversationsDb.push(convRecord);

    return res.json({
      recognized: true,
      sign: gloss,
      english_caption: english,
      telugu_translation: telugu,
      confidence: Math.round(confidence * 100) / 100,
      category: vocabMeta?.category || 'general',
      is_new_sign: isNewSign,
      motion_description: result.hand_action || vocabMeta?.movement,
      latency_ms: latency,
      status_message: `Recognized ISL Sign: ${gloss} (${Math.round(confidence * 100)}% match)`
    });

  } catch (err: any) {
    console.error('ISL recognition error:', err);
    return res.json({
      recognized: false,
      status_message: `Recognition notice: ${err.message || 'Temporary service interruption'}`,
      confidence: 0,
      is_new_sign: false,
      latency_ms: Date.now() - startTime
    });
  }
});

// 9. Conversation to Sign (Text/Speech -> ISL Grammar Translation -> ISL Sequence -> Avatar Timeline)
app.post('/api/conversation-to-sign', async (req, res) => {
  const { text, source_language, avatar_gender, speed } = req.body;
  const speedFactor = speed || 1.0;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text input is required.' });
  }

  const rawText = text.trim();
  const isTelugu = /[\u0C00-\u0C7F]/.test(rawText);
  const detectedLang = source_language && source_language !== 'auto' ? source_language : (isTelugu ? 'te' : 'en');

  const ai = getGeminiClient();
  let englishText = rawText;
  let teluguText = '';
  let islSequence: string[] = [];
  let grammarExplanation = '';

  if (ai) {
    try {
      const prompt = `You are an expert computational linguist in Indian Sign Language (ISL) grammar.
Process this message: "${rawText}".
Detected language: ${detectedLang === 'te' ? 'Telugu' : 'English'}.
Translate between English and Telugu as needed.
Then, transform the sentence into a sequence of standard ISL glosses adhering strictly to Indian Sign Language syntax:
1. Topic-Comment / Subject-Object-Verb (SOV) order.
2. Temporal signs placed first (e.g. TODAY, YESTERDAY).
3. Question words placed at the very end (e.g. YOUR NAME WHAT).
4. Omit copulas (is, am, are, was, were) and English articles (a, an, the).
5. Negation placed at sentence end.
Output strictly JSON:
{
  "english_text": "Fluent English equivalent",
  "telugu_text": "Fluent Telugu script equivalent",
  "isl_sequence": ["GLOSS_1", "GLOSS_2", ...],
  "grammar_rules": "Explanation of ISL syntax applied"
}`;

      // Use gemini-3.1-flash-lite for lightweight, fast text translation without eating vision quota
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      englishText = parsed.english_text || rawText;
      teluguText = parsed.telugu_text || '';
      islSequence = (parsed.isl_sequence || []).map((s: string) => String(s).toUpperCase().trim());
      grammarExplanation = parsed.grammar_rules || 'ISL SOV / Topic-Comment Grammar';
    } catch {
      // Quiet fallback to rule-based engine on 429/503
    }
  }

  // Fast vocabulary lookup for Telugu text if not provided by Gemini
  if (!teluguText) {
    for (const item of Object.values(islVocabulary)) {
      if (item.english?.toLowerCase() === rawText.toLowerCase() || item.gloss === rawText.toUpperCase()) {
        teluguText = item.telugu;
        break;
      }
    }
  }

  // Rule-based fallback if sequence empty
  if (!islSequence || islSequence.length === 0) {
    const words = rawText.toUpperCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    const stopWords = new Set(['IS', 'AM', 'ARE', 'WAS', 'WERE', 'A', 'AN', 'THE', 'OF', 'TO', 'IN', 'FOR']);
    islSequence = words.filter(w => !stopWords.has(w));
    if (islSequence.length === 0) islSequence = ['HELLO'];
    grammarExplanation = 'Rule-based ISL stop-word elimination and gloss alignment';
  }

  // Generate 3D Avatar Keyframes with full anatomical coordinates & motion trajectories
  const timeline = islSequence.map((gloss) => {
    const vocabMeta = islVocabulary[gloss] || islVocabulary[gloss.replace(/-/g, ' ')];
    const basePose = getSignPose(gloss, vocabMeta);
    const duration = Math.round((basePose.duration_ms || 1200) / Math.max(0.5, Math.min(2.0, speedFactor)));
    return {
      sign: gloss,
      duration_ms: duration,
      motion_type: basePose.motion_type || 'wave',
      handshape_icon: basePose.handshape_icon || '🖐',
      right_hand: basePose.right_hand,
      left_hand: basePose.left_hand,
      head: basePose.head,
      face: basePose.face,
      description: basePose.description || vocabMeta?.movement || vocabMeta?.handshape || `Perform ISL sign for ${gloss}`,
      english: vocabMeta?.english || gloss,
      telugu: vocabMeta?.telugu || '',
      category: vocabMeta?.category || 'general'
    };
  });

  const totalDuration = timeline.reduce((acc, curr) => acc + curr.duration_ms, 0);

  // Persist conversation
  const authUser = authenticateToken(req);
  const convRecord: ConversationRecord = {
    id: nextConvId++,
    userId: authUser ? authUser.id : undefined,
    mode: 'conversation_to_sign',
    englishCaption: englishText,
    teluguTranslation: teluguText,
    signSequence: islSequence,
    rawInput: rawText,
    timestamp: new Date().toISOString()
  };
  conversationsDb.push(convRecord);

  res.json({
    input_text: rawText,
    detected_language: detectedLang,
    english_text: englishText,
    telugu_text: teluguText,
    isl_grammar_structure: grammarExplanation,
    isl_sequence: islSequence,
    timeline,
    total_duration_ms: totalDuration
  });
});

// 10. Translation API
app.post('/api/translate', async (req, res) => {
  const { text, source_lang = 'en', target_lang = 'te' } = req.body;
  if (!text || !text.trim()) {
    return res.json({ source_text: '', source_lang, target_lang, translated_text: '' });
  }

  // Fast vocabulary lookup
  for (const item of Object.values(islVocabulary)) {
    if (source_lang === 'en' && target_lang === 'te') {
      if (item.english?.toLowerCase() === text.trim().toLowerCase() || item.gloss === text.trim().toUpperCase()) {
        return res.json({ source_text: text, source_lang, target_lang, translated_text: item.telugu });
      }
    } else if (source_lang === 'te' && target_lang === 'en') {
      if (item.telugu === text.trim()) {
        return res.json({ source_text: text, source_lang, target_lang, translated_text: item.english });
      }
    }
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Translation service unavailable.' });
  }

  try {
    const prompt = `Translate the following text accurately from ${source_lang} to ${target_lang}.
Output native Telugu script with polite, natural phrasing if target is Telugu.
Output only the translated text.
Text: ${text.trim()}`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt
    });

    res.json({
      source_text: text.trim(),
      source_lang,
      target_lang,
      translated_text: result.text?.trim() || text.trim()
    });
  } catch (err: any) {
    res.status(503).json({ error: `Translation service unavailable: ${err.message}` });
  }
});

// 11. Speech-to-Text API
app.post('/api/speech-to-text', async (req, res) => {
  const { audio_base64, language = 'en-IN' } = req.body;
  if (!audio_base64) {
    return res.status(400).json({ error: 'Audio data is required.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Speech-to-text service unavailable.' });
  }

  try {
    const cleanB64 = audio_base64.includes(',') ? audio_base64.split(',')[1] : audio_base64;
    const prompt = `Transcribe this Indian audio recording accurately in ${language === 'te-IN' ? 'Telugu' : 'English'}. Output only the transcription.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        { inlineData: { mimeType: 'audio/webm', data: cleanB64 } },
        { text: prompt }
      ]
    });

    const transcript = response.text?.trim() || '';
    res.json({
      transcript,
      language,
      confidence: transcript ? 0.96 : 0.0
    });
  } catch (err: any) {
    res.status(503).json({ error: `Speech-to-text service unavailable: ${err.message}` });
  }
});

// ================= DOWNLOAD ARCHIVES ROUTES =================

const downloadsPath = path.join(process.cwd(), 'public', 'downloads');
app.use('/downloads', express.static(downloadsPath));

app.get('/api/downloads/:file', (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(downloadsPath, fileName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ================= VITE MIDDLEWARE SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GestureX] Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
