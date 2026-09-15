import React, { useRef, useEffect } from 'react';
import { Sparkles, Activity } from 'lucide-react';

/**
 * High-Fidelity Anthropomorphic ISL Signing Avatar
 * Features:
 * - 60 FPS HTML5 Canvas rendering with sub-pixel anti-aliasing
 * - Realistic anatomical proportions: Head, eyes, eyelids, nose, expressive mouth, neck, shoulders, clothing
 * - Kinematic 2-segment arm IK with natural outward-bending elbows
 * - 5-finger articulated hands with realistic joint flexion and handshapes
 * - Continuous dynamic kinetic trajectories (waves, chin sweeps, namaste prayer, chest taps, forward points, lifts)
 * - Trajectory motion trails highlighting the movement pathway of the signing hand
 * - Multi-layered HUD displaying Sign Gloss, Handshape Icon, Telugu script, and movement description
 */

// Client-side Sign Kinematics & Dynamic Poses Dictionary
const CLIENT_SIGN_PRESETS = {
  'HELLO': {
    motion_type: 'wave',
    handshape_icon: '🖐',
    handshape_name: 'Open 5-Palm',
    right_hand: { x: 0.30, y: 0.76, z: 0.25, rot_z: 15, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: 3, yaw: 0, roll: 3 },
    face: { mouth: 'smile', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Right hand open palm raised near temple, waving side to side in greeting'
  },
  'THANK YOU': {
    motion_type: 'chin_sweep',
    handshape_icon: '✋',
    handshape_name: 'Flat B-Palm',
    right_hand: { x: 0.02, y: 0.68, z: 0.2, rot_z: 0, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { mouth: 'gentle_open', eyebrows: 'up', eye_open: 0.95 },
    description: 'Flat hand touches chin and sweeps smoothly outward toward the partner'
  },
  'THANK-YOU': {
    motion_type: 'chin_sweep',
    handshape_icon: '✋',
    handshape_name: 'Flat B-Palm',
    right_hand: { x: 0.02, y: 0.68, z: 0.2, rot_z: 0, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { mouth: 'gentle_open', eyebrows: 'up', eye_open: 0.95 },
    description: 'Flat hand touches chin and sweeps smoothly outward toward the partner'
  },
  'PLEASE': {
    motion_type: 'namaste_bow',
    handshape_icon: '🙏',
    handshape_name: 'Namaste Prayer',
    right_hand: { x: 0.05, y: 0.44, z: 0.25, rot_z: -12, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.05, y: 0.44, z: 0.25, rot_z: 12, fingers: [1, 1, 1, 1, 1] },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { mouth: 'closed', eyebrows: 'raised', eye_open: 0.9 },
    description: 'Both flat palms pressed together in front of chest (Namaste gesture) with gentle bow'
  },
  'WELCOME': {
    motion_type: 'welcome_sweep',
    handshape_icon: '🤲',
    handshape_name: 'Open Palms Up',
    right_hand: { x: 0.20, y: 0.42, z: 0.3, rot_z: 20, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.20, y: 0.42, z: 0.3, rot_z: -20, fingers: [1, 1, 1, 1, 1] },
    head: { pitch: -2, yaw: 0, roll: 0 },
    face: { mouth: 'smile', eyebrows: 'up', eye_open: 1.0 },
    description: 'Both open hands sweep gently inward toward the body welcoming the person'
  },
  'HOW': {
    motion_type: 'chest_outward_roll',
    handshape_icon: '🤲',
    handshape_name: 'Curved Claw',
    right_hand: { x: 0.16, y: 0.42, z: 0.25, rot_z: 35, fingers: [0.6, 0.6, 0.6, 0.6, 0.6] },
    left_hand: { x: -0.16, y: 0.42, z: 0.25, rot_z: -35, fingers: [0.6, 0.6, 0.6, 0.6, 0.6] },
    head: { pitch: 3, yaw: 0, roll: -4 },
    face: { mouth: 'pursed', eyebrows: 'furrowed', eye_open: 0.95 },
    description: 'Both curved palms back-to-back roll outward and forward palms up'
  },
  'HOW ARE YOU': {
    motion_type: 'chest_outward_roll',
    handshape_icon: '🤲',
    handshape_name: 'Curved Claw',
    right_hand: { x: 0.16, y: 0.42, z: 0.25, rot_z: 35, fingers: [0.6, 0.6, 0.6, 0.6, 0.6] },
    left_hand: { x: -0.16, y: 0.42, z: 0.25, rot_z: -35, fingers: [0.6, 0.6, 0.6, 0.6, 0.6] },
    head: { pitch: 3, yaw: 0, roll: -4 },
    face: { mouth: 'pursed', eyebrows: 'furrowed', eye_open: 0.95 },
    description: 'Curved hands rotate outward from chest toward recipient with questioning brow'
  },
  'YOU': {
    motion_type: 'point_forward',
    handshape_icon: '👉',
    handshape_name: 'Index Point',
    right_hand: { x: 0.08, y: 0.48, z: 0.5, rot_z: 0, fingers: [0, 1, 0, 0, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: 2, yaw: 0, roll: 0 },
    face: { mouth: 'closed', eyebrows: 'raised', eye_open: 1.0 },
    description: 'Right index finger points forward toward conversation partner'
  },
  'FINE': {
    motion_type: 'chest_tap',
    handshape_icon: '👌',
    handshape_name: 'Open 5 Thumb Touch',
    right_hand: { x: 0.04, y: 0.46, z: 0.15, rot_z: 5, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -5, yaw: 0, roll: 0 },
    face: { mouth: 'smile', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Open 5-hand with thumb tapping center chest with approving nod'
  },
  'HELP': {
    motion_type: 'support_lift',
    handshape_icon: '✊',
    handshape_name: 'Supportive Platform',
    right_hand: { x: 0.0, y: 0.45, z: 0.3, rot_z: 0, fingers: [1, 0, 0, 0, 0] },
    left_hand: { x: 0.0, y: 0.36, z: 0.3, rot_z: 0, fingers: [1, 1, 1, 1, 1] },
    head: { pitch: -3, yaw: 0, roll: 0 },
    face: { mouth: 'neutral', eyebrows: 'raised', eye_open: 1.0 },
    description: 'Right fist with thumb up rested on flat upward palm, lifted upward together'
  },
  'WATER': {
    motion_type: 'chin_tap',
    handshape_icon: '🤟',
    handshape_name: 'W-Handshape',
    right_hand: { x: 0.04, y: 0.68, z: 0.15, rot_z: 0, fingers: [0, 1, 1, 1, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: 0, yaw: 0, roll: 0 },
    face: { mouth: 'gentle_open', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'W-hand (index, middle, ring fingers extended) taps lower lip/chin twice'
  },
  'FOOD': {
    motion_type: 'mouth_tap',
    handshape_icon: '🍱',
    handshape_name: 'Flattened O-Tips',
    right_hand: { x: 0.03, y: 0.70, z: 0.12, rot_z: 0, fingers: [0.4, 0.4, 0.4, 0.4, 0.4] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -2, yaw: 0, roll: 0 },
    face: { mouth: 'gentle_open', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Flattened O-hand tips touch lips repeatedly in Indian eating gesture'
  },
  'DRINK': {
    motion_type: 'mouth_tap',
    handshape_icon: '🥤',
    handshape_name: 'C-Glass Tilt',
    right_hand: { x: 0.04, y: 0.68, z: 0.15, rot_z: 20, fingers: [0.6, 0.6, 0.6, 0.6, 0.6] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: 6, yaw: 0, roll: 0 },
    face: { mouth: 'gentle_open', eyebrows: 'neutral', eye_open: 0.9 },
    description: 'C-hand mimics holding glass tipping toward mouth'
  },
  'I': {
    motion_type: 'point_inward',
    handshape_icon: '☝️',
    handshape_name: 'Direct Point',
    right_hand: { x: 0.0, y: 0.46, z: 0.08, rot_z: 0, fingers: [0, 1, 0, 0, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -4, yaw: 0, roll: 0 },
    face: { mouth: 'closed', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Index finger points directly at chest center'
  },
  'ME': {
    motion_type: 'point_inward',
    handshape_icon: '☝️',
    handshape_name: 'Direct Point',
    right_hand: { x: 0.0, y: 0.46, z: 0.08, rot_z: 0, fingers: [0, 1, 0, 0, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -4, yaw: 0, roll: 0 },
    face: { mouth: 'closed', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Index finger points directly at chest center'
  },
  'NAME': {
    motion_type: 'finger_cross',
    handshape_icon: '✌️',
    handshape_name: 'H-Hands Parallel',
    right_hand: { x: 0.06, y: 0.48, z: 0.2, rot_z: -30, fingers: [0, 1, 1, 0, 0] },
    left_hand: { x: -0.06, y: 0.46, z: 0.2, rot_z: 30, fingers: [0, 1, 1, 0, 0] },
    head: { pitch: 0, yaw: 0, roll: 0 },
    face: { mouth: 'closed', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'H-fingers of both hands tap crosswise twice in front of chest'
  },
  'YES': {
    motion_type: 'nod',
    handshape_icon: '✊',
    handshape_name: 'S-Fist Nod',
    right_hand: { x: 0.16, y: 0.52, z: 0.25, rot_z: 0, fingers: [0, 0, 0, 0, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -8, yaw: 0, roll: 0 },
    face: { mouth: 'smile', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Right S-fist nods vertically like a head, affirming agreement'
  },
  'NO': {
    motion_type: 'shake',
    handshape_icon: '✋',
    handshape_name: 'Snap Shake',
    right_hand: { x: 0.14, y: 0.52, z: 0.25, rot_z: 0, fingers: [0.5, 0.5, 0.5, 0, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: 0, yaw: 12, roll: 0 },
    face: { mouth: 'closed', eyebrows: 'furrowed', eye_open: 0.95 },
    description: 'Index and middle fingers snap down onto thumb with lateral head shake'
  },
  'GOOD': {
    motion_type: 'thumbs_up',
    handshape_icon: '👍',
    handshape_name: 'Thumbs Up',
    right_hand: { x: 0.12, y: 0.50, z: 0.35, rot_z: 0, fingers: [1, 0, 0, 0, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -5, yaw: 0, roll: 0 },
    face: { mouth: 'smile', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Right hand gives firm thumbs-up moving forward with approving nod'
  },
  'SORRY': {
    motion_type: 'circular_rub',
    handshape_icon: '✊',
    handshape_name: 'A-Fist Rub',
    right_hand: { x: 0.02, y: 0.46, z: 0.12, rot_z: 0, fingers: [0, 0, 0, 0, 0] },
    left_hand: { x: -0.28, y: 0.04, z: 0.0, rot_z: 0, fingers: [0.2, 0.2, 0.2, 0.2, 0.2] },
    head: { pitch: -6, yaw: 0, roll: 2 },
    face: { mouth: 'tight', eyebrows: 'raised', eye_open: 0.9 },
    description: 'Fist rubbed in circular motion over chest center'
  },
  'MORNING': {
    motion_type: 'sun_rise',
    handshape_icon: '🌅',
    handshape_name: 'Rising Sun',
    right_hand: { x: 0.12, y: 0.62, z: 0.25, rot_z: 15, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.05, y: 0.35, z: 0.2, rot_z: -90, fingers: [1, 1, 1, 1, 1] },
    head: { pitch: 3, yaw: 0, roll: 0 },
    face: { mouth: 'smile', eyebrows: 'raised', eye_open: 1.0 },
    description: 'Left arm forms horizontal horizon; right open hand rises like the sun'
  },
  'NIGHT': {
    motion_type: 'sun_set',
    handshape_icon: '🌙',
    handshape_name: 'Setting Sun',
    right_hand: { x: 0.05, y: 0.38, z: 0.25, rot_z: -45, fingers: [0.7, 0.7, 0.7, 0.7, 0.7] },
    left_hand: { x: -0.05, y: 0.35, z: 0.2, rot_z: -90, fingers: [1, 1, 1, 1, 1] },
    head: { pitch: -4, yaw: 0, roll: 0 },
    face: { mouth: 'closed', eyebrows: 'neutral', eye_open: 0.85 },
    description: 'Right hand arches down over horizontal left arm representing sunset'
  },
  'WHAT': {
    motion_type: 'shrug',
    handshape_icon: '🤷',
    handshape_name: 'Open Palms Up',
    right_hand: { x: 0.22, y: 0.42, z: 0.3, rot_z: 22, fingers: [1, 1, 1, 1, 1] },
    left_hand: { x: -0.22, y: 0.42, z: 0.3, rot_z: -22, fingers: [1, 1, 1, 1, 1] },
    head: { pitch: 3, yaw: 0, roll: -5 },
    face: { mouth: 'slightly_open', eyebrows: 'furrowed', eye_open: 0.95 },
    description: 'Open palms facing up shaking horizontally with puzzled brow'
  },
  'SIGN LANGUAGE': {
    motion_type: 'alternating_circles',
    handshape_icon: '👐',
    handshape_name: 'Index Pedals',
    right_hand: { x: 0.14, y: 0.48, z: 0.3, rot_z: 0, fingers: [0, 1, 0, 0, 0] },
    left_hand: { x: -0.14, y: 0.48, z: 0.3, rot_z: 0, fingers: [0, 1, 0, 0, 0] },
    head: { pitch: -2, yaw: 0, roll: 0 },
    face: { mouth: 'gentle_open', eyebrows: 'neutral', eye_open: 1.0 },
    description: 'Both index fingers rotate in alternating backward circles toward chest'
  }
};

export function ISLAvatar({
  activeKeyframe,
  gender = 'female',
  isPlaying = true,
  speed = 1.0,
}) {
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const signStartTimeRef = useRef(performance.now());
  const trailPointsRef = useRef([]);

  // Dynamic animation state
  const stateRef = useRef({
    time: 0,
    blinkTime: 0,
    isBlinking: false,
    breathTime: 0,
    currentPose: {
      headPitch: 0,
      headYaw: 0,
      headRoll: 0,
      rArmX: 0.28,
      rArmY: 0.04,
      rArmZ: 0.0,
      rWristRot: 0,
      rFingers: [0.2, 0.2, 0.2, 0.2, 0.2],
      lArmX: -0.28,
      lArmY: 0.04,
      lArmZ: 0.0,
      lWristRot: 0,
      lFingers: [0.2, 0.2, 0.2, 0.2, 0.2],
      mouthOpen: 0,
      eyebrowLift: 0,
    },
    targetPose: {
      headPitch: 0,
      headYaw: 0,
      headRoll: 0,
      rArmX: 0.28,
      rArmY: 0.04,
      rArmZ: 0.0,
      rWristRot: 0,
      rFingers: [0.2, 0.2, 0.2, 0.2, 0.2],
      lArmX: -0.28,
      lArmY: 0.04,
      lArmZ: 0.0,
      lWristRot: 0,
      lFingers: [0.2, 0.2, 0.2, 0.2, 0.2],
      mouthOpen: 0,
      eyebrowLift: 0,
    },
    motionType: 'wave',
  });

  // Extract or synthesize pose configuration whenever activeKeyframe changes
  useEffect(() => {
    signStartTimeRef.current = performance.now();
    trailPointsRef.current = []; // reset gesture trail

    if (!activeKeyframe) {
      // Natural resting pose
      stateRef.current.targetPose = {
        headPitch: 0,
        headYaw: 0,
        headRoll: 0,
        rArmX: 0.28,
        rArmY: 0.04,
        rArmZ: 0.0,
        rWristRot: 0,
        rFingers: [0.2, 0.2, 0.2, 0.2, 0.2],
        lArmX: -0.28,
        lArmY: 0.04,
        lArmZ: 0.0,
        lWristRot: 0,
        lFingers: [0.2, 0.2, 0.2, 0.2, 0.2],
        mouthOpen: 0,
        eyebrowLift: 0,
      };
      stateRef.current.motionType = 'rest';
      return;
    }

    const signName = (activeKeyframe.sign || '').toUpperCase().trim();
    const preset = CLIENT_SIGN_PRESETS[signName] || CLIENT_SIGN_PRESETS[signName.replace(/-/g, ' ')];

    // Priority: 1. activeKeyframe props from API -> 2. Client preset -> 3. Fallback
    const rh = activeKeyframe.right_hand || preset?.right_hand || {};
    const lh = activeKeyframe.left_hand || preset?.left_hand || {};
    const hd = activeKeyframe.head || preset?.head || {};
    const fc = activeKeyframe.face || preset?.face || {};
    const motion = activeKeyframe.motion_type || preset?.motion_type || 'wave';

    stateRef.current.motionType = motion;

    stateRef.current.targetPose = {
      headPitch: hd.pitch !== undefined ? hd.pitch : 0,
      headYaw: hd.yaw !== undefined ? hd.yaw : 0,
      headRoll: hd.roll !== undefined ? hd.roll : 0,
      rArmX: rh.x !== undefined ? rh.x : 0.22,
      rArmY: rh.y !== undefined ? rh.y : 0.52,
      rArmZ: rh.z !== undefined ? rh.z : 0.2,
      rWristRot: rh.rot_z !== undefined ? rh.rot_z : 10,
      rFingers: rh.fingers || [0.9, 0.9, 0.9, 0.9, 0.9],
      lArmX: lh.x !== undefined ? lh.x : -0.28,
      lArmY: lh.y !== undefined ? lh.y : 0.05,
      lArmZ: lh.z !== undefined ? lh.z : 0.0,
      lWristRot: lh.rot_z !== undefined ? lh.rot_z : 0,
      lFingers: lh.fingers || [0.2, 0.2, 0.2, 0.2, 0.2],
      mouthOpen: fc.mouth === 'gentle_open' ? 0.35 : fc.mouth === 'smile' ? 0.2 : 0.05,
      eyebrowLift: fc.eyebrows === 'raised' || fc.eyebrows === 'up' ? 0.5 : fc.eyebrows === 'furrowed' ? -0.4 : 0,
    };
  }, [activeKeyframe]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const lerp = (a, b, t) => a + (b - a) * t;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const state = stateRef.current;

      state.time += 0.02 * speed;
      state.breathTime += 0.03;
      state.blinkTime += 0.016;

      // Natural eye blinking
      if (state.blinkTime > 3.4) {
        state.isBlinking = true;
        if (state.blinkTime > 3.55) {
          state.isBlinking = false;
          state.blinkTime = Math.random() * 0.4;
        }
      }

      // Elapsed time in active sign
      const now = performance.now();
      const elapsedMs = (now - signStartTimeRef.current) * speed;
      const durationMs = Math.max(700, (activeKeyframe?.duration_ms || 1200));
      const progress = Math.min(1.0, elapsedMs / durationMs);
      const cycle = (elapsedMs / 1000) * Math.PI * 2;

      // Calculate procedural dynamic trajectory offsets based on motion type
      let dynRWristRot = 0;
      let dynRArmX = 0;
      let dynRArmY = 0;
      let dynLWristRot = 0;
      let dynLArmX = 0;
      let dynLArmY = 0;
      let dynHeadPitch = 0;
      let dynHeadRoll = 0;

      if (isPlaying && activeKeyframe) {
        const m = state.motionType;
        if (m === 'wave') {
          // Energetic hand wave side-to-side
          dynRWristRot = Math.sin(cycle * 3) * 22;
          dynRArmX = Math.sin(cycle * 3) * 0.05;
          dynHeadRoll = Math.sin(cycle * 1.5) * 2.5;
        } else if (m === 'chin_sweep') {
          // Hand starts at chin, sweeps forward and down
          const t = Math.sin(progress * Math.PI * 0.5);
          dynRArmY = -(t * 0.22);
          dynRArmX = t * 0.05;
          dynHeadPitch = -6 * Math.sin(progress * Math.PI);
        } else if (m === 'namaste_bow') {
          // Gentle bowing motion
          const bow = Math.sin(progress * Math.PI);
          dynHeadPitch = -7 * bow;
          dynRArmY = bow * 0.03;
          dynLArmY = bow * 0.03;
        } else if (m === 'chest_outward_roll') {
          // Curved hands rotate outward from chest
          const roll = Math.sin(progress * Math.PI);
          dynRWristRot = roll * 45;
          dynLWristRot = -roll * 45;
          dynRArmX = roll * 0.06;
          dynLArmX = -roll * 0.06;
          dynHeadPitch = 3 * roll;
        } else if (m === 'point_forward') {
          // Index finger forward pulse
          const pulse = Math.sin(cycle * 2.2);
          dynRArmY = pulse * 0.02;
          dynRArmX = pulse * 0.01;
        } else if (m === 'chest_tap' || m === 'chin_tap') {
          // Rhythmic tapping motion
          const tap = Math.abs(Math.sin(cycle * 3.0));
          dynRArmY = tap * 0.05;
          dynHeadPitch = -4 * tap;
        } else if (m === 'mouth_tap') {
          // Hand taps towards mouth
          const tap = Math.abs(Math.sin(cycle * 2.8));
          dynRArmY = tap * 0.04;
        } else if (m === 'support_lift') {
          // Both hands lift upward together
          const lift = Math.sin(progress * Math.PI);
          dynRArmY = lift * 0.12;
          dynLArmY = lift * 0.10;
        } else if (m === 'circular_rub') {
          // Circular rubbing over chest
          dynRArmX = Math.cos(cycle * 2.5) * 0.04;
          dynRArmY = Math.sin(cycle * 2.5) * 0.04;
        } else if (m === 'sun_rise') {
          // Rising arc
          const rise = Math.sin(progress * Math.PI);
          dynRArmY = rise * 0.18;
          dynRWristRot = rise * 15;
        } else if (m === 'sun_set') {
          // Sunset downward arc
          const set = Math.sin(progress * Math.PI);
          dynRArmY = -set * 0.12;
          dynRWristRot = -set * 20;
        } else if (m === 'thumbs_up') {
          // Firm forward push
          const push = Math.sin(progress * Math.PI);
          dynRArmY = push * 0.04;
          dynHeadPitch = -5 * push;
        } else if (m === 'shrug') {
          // Puzzled shrug
          const shrug = Math.sin(progress * Math.PI);
          dynRArmY = shrug * 0.08;
          dynLArmY = shrug * 0.08;
          dynRWristRot = shrug * 25;
          dynLWristRot = -shrug * 25;
          dynHeadPitch = 4 * shrug;
        } else if (m === 'nod') {
          // Fist nodding
          const nod = Math.sin(cycle * 3);
          dynRWristRot = nod * 20;
          dynHeadPitch = nod * 6;
        } else if (m === 'shake') {
          // Hand and head shake
          const shake = Math.sin(cycle * 3);
          dynRArmX = shake * 0.04;
          dynHeadPitch = 0;
        } else if (m === 'alternating_circles') {
          // Bicycle pedaling
          dynRArmX = Math.cos(cycle * 2.2) * 0.04;
          dynRArmY = Math.sin(cycle * 2.2) * 0.04;
          dynLArmX = Math.cos(cycle * 2.2 + Math.PI) * 0.04;
          dynLArmY = Math.sin(cycle * 2.2 + Math.PI) * 0.04;
        }
      }

      // Smooth kinematic interpolation towards target pose + dynamic offsets
      const tRate = isPlaying ? 0.14 * Math.min(speed, 2.0) : 0.06;
      const cur = state.currentPose;
      const tgt = state.targetPose;

      cur.headPitch = lerp(cur.headPitch, tgt.headPitch + dynHeadPitch, tRate);
      cur.headYaw = lerp(cur.headYaw, tgt.headYaw, tRate);
      cur.headRoll = lerp(cur.headRoll, tgt.headRoll + dynHeadRoll, tRate);

      cur.rArmX = lerp(cur.rArmX, tgt.rArmX + dynRArmX, tRate);
      cur.rArmY = lerp(cur.rArmY, tgt.rArmY + dynRArmY, tRate);
      cur.rArmZ = lerp(cur.rArmZ, tgt.rArmZ, tRate);
      cur.rWristRot = lerp(cur.rWristRot, tgt.rWristRot + dynRWristRot, tRate);

      cur.lArmX = lerp(cur.lArmX, tgt.lArmX + dynLArmX, tRate);
      cur.lArmY = lerp(cur.lArmY, tgt.lArmY + dynLArmY, tRate);
      cur.lArmZ = lerp(cur.lArmZ, tgt.lArmZ, tRate);
      cur.lWristRot = lerp(cur.lWristRot, tgt.lWristRot + dynLWristRot, tRate);

      cur.mouthOpen = lerp(cur.mouthOpen, tgt.mouthOpen, tRate);
      cur.eyebrowLift = lerp(cur.eyebrowLift, tgt.eyebrowLift, tRate);

      for (let i = 0; i < 5; i++) {
        cur.rFingers[i] = lerp(cur.rFingers[i], tgt.rFingers[i] !== undefined ? tgt.rFingers[i] : 0.8, tRate);
        cur.lFingers[i] = lerp(cur.lFingers[i], tgt.lFingers[i] !== undefined ? tgt.lFingers[i] : 0.2, tRate);
      }

      // Breathing expansion
      const breath = Math.sin(state.breathTime) * 2.5;

      // Color Palette based on Gender and Skin tone
      const isFemale = gender === 'female';
      const skinBase = isFemale ? '#E8B997' : '#D9A57D';
      const skinShadow = isFemale ? '#CF9B77' : '#BF8761';
      const skinHighlight = isFemale ? '#F5D3B8' : '#E8BFA0';
      const hairColor = '#1A1817';
      const clothesPrimary = isFemale ? '#1E3A8A' : '#1E293B';
      const clothesCollar = isFemale ? '#3B82F6' : '#475569';

      // Clear Canvas & draw clean studio background
      ctx.clearRect(0, 0, width, height);

      // Studio Vignette Background
      const bgGrad = ctx.createRadialGradient(width / 2, height * 0.45, 30, width / 2, height * 0.45, width * 0.75);
      bgGrad.addColorStop(0, '#1E293B');
      bgGrad.addColorStop(1, '#090D16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle studio grid/stage accent
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 40; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Center Anchor Coordinates
      const centerX = width / 2;
      const centerY = height * 0.46;
      const scale = Math.min(width, height) / 460;

      // ================= 1. TORSO & CLOTHING =================
      ctx.save();
      ctx.translate(centerX, centerY + 130 * scale + breath);

      // Shoulders & Chest
      ctx.beginPath();
      ctx.moveTo(-110 * scale, 50 * scale);
      ctx.quadraticCurveTo(-90 * scale, -45 * scale, -45 * scale, -55 * scale);
      ctx.lineTo(45 * scale, -55 * scale);
      ctx.quadraticCurveTo(90 * scale, -45 * scale, 110 * scale, 50 * scale);
      ctx.lineTo(125 * scale, 170 * scale);
      ctx.lineTo(-125 * scale, 170 * scale);
      ctx.closePath();

      const torsoGrad = ctx.createLinearGradient(0, -60 * scale, 0, 150 * scale);
      torsoGrad.addColorStop(0, clothesPrimary);
      torsoGrad.addColorStop(1, '#0B1120');
      ctx.fillStyle = torsoGrad;
      ctx.fill();

      // Shirt Collar / V-neck detail
      ctx.beginPath();
      ctx.moveTo(-35 * scale, -55 * scale);
      ctx.lineTo(0, -10 * scale);
      ctx.lineTo(35 * scale, -55 * scale);
      ctx.strokeStyle = clothesCollar;
      ctx.lineWidth = 4 * scale;
      ctx.stroke();

      ctx.restore();

      // ================= 2. NECK =================
      ctx.save();
      ctx.translate(centerX, centerY + 65 * scale + breath * 0.5);

      ctx.beginPath();
      ctx.moveTo(-20 * scale, 15 * scale);
      ctx.lineTo(-18 * scale, -40 * scale);
      ctx.lineTo(18 * scale, -40 * scale);
      ctx.lineTo(20 * scale, 15 * scale);
      ctx.closePath();
      const neckGrad = ctx.createLinearGradient(0, -35 * scale, 0, 15 * scale);
      neckGrad.addColorStop(0, skinHighlight);
      neckGrad.addColorStop(0.7, skinBase);
      neckGrad.addColorStop(1, skinShadow);
      ctx.fillStyle = neckGrad;
      ctx.fill();

      ctx.restore();

      // ================= 3. HEAD & FACE =================
      ctx.save();
      const headX = centerX + cur.headYaw * 1.5 * scale;
      const headY = centerY + 10 * scale + breath * 0.3 + cur.headPitch * 1.2 * scale;
      ctx.translate(headX, headY);
      ctx.rotate((cur.headRoll * Math.PI) / 180);

      // Ears
      ctx.fillStyle = skinShadow;
      ctx.beginPath();
      ctx.ellipse(-48 * scale, -5 * scale, 6 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(48 * scale, -5 * scale, 6 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head Base Oval
      ctx.beginPath();
      if (isFemale) {
        ctx.ellipse(0, -8 * scale, 45 * scale, 56 * scale, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(0, -8 * scale, 47 * scale, 58 * scale, 0, 0, Math.PI * 2);
      }
      const headGrad = ctx.createRadialGradient(-10 * scale, -20 * scale, 10 * scale, 0, 0, 60 * scale);
      headGrad.addColorStop(0, skinHighlight);
      headGrad.addColorStop(0.6, skinBase);
      headGrad.addColorStop(1, skinShadow);
      ctx.fillStyle = headGrad;
      ctx.fill();

      // Eyebrows
      const browY = -24 * scale - cur.eyebrowLift * 6 * scale;
      ctx.strokeStyle = hairColor;
      ctx.lineWidth = isFemale ? 2.5 * scale : 3.5 * scale;
      ctx.lineCap = 'round';

      // Left Eyebrow
      ctx.beginPath();
      ctx.moveTo(-28 * scale, browY + 2 * scale);
      ctx.quadraticCurveTo(-20 * scale, browY - 3 * scale, -10 * scale, browY);
      ctx.stroke();

      // Right Eyebrow
      ctx.beginPath();
      ctx.moveTo(10 * scale, browY);
      ctx.quadraticCurveTo(20 * scale, browY - 3 * scale, 28 * scale, browY + 2 * scale);
      ctx.stroke();

      // Eyes
      const eyeY = -12 * scale;
      const drawEye = (xOffset) => {
        ctx.save();
        ctx.translate(xOffset, eyeY);

        if (state.isBlinking) {
          // Closed eyelid line
          ctx.beginPath();
          ctx.moveTo(-10 * scale, 0);
          ctx.quadraticCurveTo(0, 2 * scale, 10 * scale, 0);
          ctx.strokeStyle = skinShadow;
          ctx.lineWidth = 2 * scale;
          ctx.stroke();
        } else {
          // Sclera (White)
          ctx.beginPath();
          ctx.ellipse(0, 0, 10 * scale, 5.5 * scale, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          // Iris (Warm Deep Brown)
          ctx.beginPath();
          ctx.arc(0.5 * scale, 0, 4.5 * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#3E2723';
          ctx.fill();

          // Pupil
          ctx.beginPath();
          ctx.arc(0.5 * scale, 0, 2.2 * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();

          // Catchlight
          ctx.beginPath();
          ctx.arc(-1 * scale, -1.5 * scale, 1.2 * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          // Eyelid crease
          ctx.beginPath();
          ctx.moveTo(-11 * scale, -1 * scale);
          ctx.quadraticCurveTo(0, -6.5 * scale, 11 * scale, -1 * scale);
          ctx.strokeStyle = skinShadow;
          ctx.lineWidth = 1.2 * scale;
          ctx.stroke();
        }
        ctx.restore();
      };

      drawEye(-19 * scale);
      drawEye(19 * scale);

      // Nose
      ctx.beginPath();
      ctx.moveTo(0, -8 * scale);
      ctx.lineTo(2 * scale, 8 * scale);
      ctx.quadraticCurveTo(0, 11 * scale, -2 * scale, 8 * scale);
      ctx.strokeStyle = skinShadow;
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Nostrils
      ctx.fillStyle = skinShadow;
      ctx.beginPath();
      ctx.arc(-4 * scale, 9 * scale, 1.2 * scale, 0, Math.PI * 2);
      ctx.arc(4 * scale, 9 * scale, 1.2 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Mouth / Lips
      const mouthY = 24 * scale;
      const mOpen = cur.mouthOpen * 7 * scale;

      ctx.save();
      ctx.translate(0, mouthY);

      if (mOpen > 1.0) {
        // Expressive open mouth
        ctx.beginPath();
        ctx.ellipse(0, 0, 11 * scale, mOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#831843';
        ctx.fill();

        // Upper Lip
        ctx.beginPath();
        ctx.moveTo(-12 * scale, -1 * scale);
        ctx.quadraticCurveTo(0, -5 * scale, 12 * scale, -1 * scale);
        ctx.strokeStyle = isFemale ? '#BE185D' : '#9F1239';
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();
      } else {
        // Closed / Gentle Smiling Lips
        ctx.beginPath();
        ctx.moveTo(-13 * scale, 0);
        ctx.quadraticCurveTo(0, 4 * scale, 13 * scale, 0);
        ctx.strokeStyle = isFemale ? '#BE185D' : '#9F1239';
        ctx.lineWidth = 3 * scale;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Lip crease shadow
        ctx.beginPath();
        ctx.moveTo(-10 * scale, 1 * scale);
        ctx.quadraticCurveTo(0, 3 * scale, 10 * scale, 1 * scale);
        ctx.strokeStyle = '#4C0519';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
      }
      ctx.restore();

      // Hair
      ctx.fillStyle = hairColor;
      if (isFemale) {
        // Elegant professional pinned hair with front framing strands
        ctx.beginPath();
        ctx.moveTo(-48 * scale, 5 * scale);
        ctx.quadraticCurveTo(-52 * scale, -55 * scale, 0, -68 * scale);
        ctx.quadraticCurveTo(52 * scale, -55 * scale, 48 * scale, 5 * scale);
        ctx.quadraticCurveTo(42 * scale, -40 * scale, 10 * scale, -52 * scale);
        ctx.quadraticCurveTo(-30 * scale, -45 * scale, -48 * scale, 5 * scale);
        ctx.fill();

        // Ponytail / Bun indicator behind shoulders
        ctx.beginPath();
        ctx.ellipse(0, -65 * scale, 24 * scale, 12 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Modern styled short hair
        ctx.beginPath();
        ctx.moveTo(-48 * scale, -10 * scale);
        ctx.quadraticCurveTo(-50 * scale, -60 * scale, 0, -70 * scale);
        ctx.quadraticCurveTo(50 * scale, -60 * scale, 48 * scale, -10 * scale);
        ctx.quadraticCurveTo(35 * scale, -48 * scale, 0, -56 * scale);
        ctx.quadraticCurveTo(-35 * scale, -48 * scale, -48 * scale, -10 * scale);
        ctx.fill();
      }

      ctx.restore();

      // ================= 4. ARMS & 5-FINGER HANDS =================
      const drawLimbAndHand = (isRight) => {
        ctx.save();
        const sideMult = isRight ? 1 : -1;
        const shoulderX = centerX + sideMult * 85 * scale;
        const shoulderY = centerY + 80 * scale + breath;

        const armXCoord = isRight ? cur.rArmX : cur.lArmX;
        const armYCoord = isRight ? cur.rArmY : cur.lArmY;
        const wristRot = isRight ? cur.rWristRot : cur.lWristRot;
        const fingers = isRight ? cur.rFingers : cur.lFingers;

        // Hand Target in Canvas Space
        const handTargetX = centerX + armXCoord * width * 0.45;
        const handTargetY = centerY + 130 * scale - armYCoord * height * 0.45;

        // Record trajectory points for gesturing hand
        if (isRight && isPlaying && activeKeyframe) {
          const trail = trailPointsRef.current;
          trail.push({ x: handTargetX, y: handTargetY, time: now });
          // keep points from last 350ms
          while (trail.length > 0 && now - trail[0].time > 350) {
            trail.shift();
          }
        }

        // Realistic 2-segment arm inverse kinematics with outward elbow bending
        const midX = (shoulderX + handTargetX) / 2;
        const midY = (shoulderY + handTargetY) / 2;
        const dx = handTargetX - shoulderX;
        const dy = handTargetY - shoulderY;
        const dist = Math.hypot(dx, dy);

        // Perpendicular vector for natural outward elbow flare
        const perpX = -dy / (dist || 1);
        const perpY = dx / (dist || 1);
        const elbowOut = Math.max(14, 38 * scale - dist * 0.08);

        const elbowX = midX + sideMult * Math.abs(perpX) * elbowOut;
        const elbowY = midY + 16 * scale + perpY * sideMult * 10 * scale;

        // Draw Upper Arm & Forearm
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(handTargetX, handTargetY);
        ctx.strokeStyle = skinShadow;
        ctx.lineWidth = 14 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.strokeStyle = skinBase;
        ctx.lineWidth = 11 * scale;
        ctx.stroke();

        // Draw Articulated 5-Finger Hand
        ctx.translate(handTargetX, handTargetY);
        ctx.rotate((wristRot * Math.PI) / 180);

        // Palm Base
        ctx.beginPath();
        ctx.ellipse(0, 0, 11 * scale, 12 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = skinBase;
        ctx.fill();

        // 5 Articulated Fingers (Thumb, Index, Middle, Ring, Pinky)
        const fingerAngles = isRight
          ? [-50, -20, 0, 20, 42]
          : [50, 20, 0, -20, -42];
        const fingerLengths = [11, 18, 20, 18, 14];

        for (let f = 0; f < 5; f++) {
          const curl = fingers[f] !== undefined ? fingers[f] : 0.8;
          const fAngle = (fingerAngles[f] * Math.PI) / 180;
          const fLen = fingerLengths[f] * scale * Math.max(0.2, curl);

          ctx.save();
          ctx.rotate(fAngle);

          // Phalanx joint 1 & 2
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -fLen);
          ctx.strokeStyle = skinBase;
          ctx.lineWidth = 3.5 * scale;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Finger tip highlight
          ctx.beginPath();
          ctx.arc(0, -fLen, 2.2 * scale, 0, Math.PI * 2);
          ctx.fillStyle = skinHighlight;
          ctx.fill();

          ctx.restore();
        }

        ctx.restore();
      };

      // Draw Left Arm first (behind or secondary), then Right Arm (dominant)
      drawLimbAndHand(false);
      drawLimbAndHand(true);

      // ================= 5. DRAW GESTURE TRAJECTORY TRAIL =================
      const trail = trailPointsRef.current;
      if (trail.length > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [gender, speed, isPlaying, activeKeyframe]);

  // Current preset metadata fallback for HUD
  const signKey = (activeKeyframe?.sign || '').toUpperCase().trim();
  const presetMeta = CLIENT_SIGN_PRESETS[signKey] || CLIENT_SIGN_PRESETS[signKey.replace(/-/g, ' ')];
  const handshapeIcon = activeKeyframe?.handshape_icon || presetMeta?.handshape_icon || '🖐';
  const handshapeName = presetMeta?.handshape_name || 'ISL Articulated Shape';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center min-h-[360px] sm:min-h-[420px]">
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full h-full object-contain max-h-[460px]"
      />

      {/* Dynamic ISL Sign HUD Tag with Handshape and Telugu Script */}
      {activeKeyframe && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-teal-500/50 shadow-lg">
            <span className="text-base">{handshapeIcon}</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Signing ISL:</span>
                <span className="text-sm font-extrabold text-teal-300">{activeKeyframe.sign}</span>
              </div>
              {activeKeyframe.telugu && (
                <span className="text-xs text-amber-300 font-medium font-telugu pl-3.5">
                  {activeKeyframe.telugu}
                </span>
              )}
            </div>
          </div>

          {/* Active Motion Dynamics Pill */}
          {isPlaying && (
            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/70 text-[10px] text-slate-300 self-start">
              <Activity className="w-3 h-3 text-teal-400 animate-bounce" />
              <span>Gesture Active ({speed}x speed)</span>
            </div>
          )}
        </div>
      )}

      {/* Top Right: Model Alignment Badge */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>{handshapeName}</span>
      </div>

      {/* Movement Description Caption Bar */}
      {activeKeyframe?.description && (
        <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-xl text-center shadow-xl max-w-md">
            <p className="text-xs text-slate-200 leading-snug">
              <span className="font-semibold text-teal-400">ISL Movement: </span>
              {activeKeyframe.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
