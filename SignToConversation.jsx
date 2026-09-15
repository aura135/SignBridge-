import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Volume2, VolumeX, Sparkles, AlertTriangle, ShieldCheck, Trash2, Clock, Check, RefreshCw, Zap, Scan, Info, Sliders } from 'lucide-react';
import { CameraPanel } from './CameraPanel';
import { useCamera } from '../hooks/useCamera';
import { useSpeech } from '../hooks/useSpeech';
import { api } from '../services/api';

const POPULAR_ISL_SIGNS = [
  { sign: 'HELLO', label: '👋 Hello', hint: 'Wave open palm near temple' },
  { sign: 'PLEASE', label: '🙏 Namaste / Please', hint: 'Press flat palms together in front of chest' },
  { sign: 'THANK YOU', label: '🫱 Thank You', hint: 'Touch fingers to chin and extend forward' },
  { sign: 'GOOD', label: '👍 Good / Yes', hint: 'Hold thumb upright or nod fist' },
  { sign: 'NO', label: '☝️ No', hint: 'Shake index finger side-to-side' },
  { sign: 'I', label: '👉 I / Me', hint: 'Point index finger at center of chest' },
  { sign: 'YOU', label: '🫵 You', hint: 'Point index finger toward camera' },
  { sign: 'HELP', label: '🆘 Help', hint: 'Place thumb-up fist on open palm & lift' },
  { sign: 'WATER', label: '💧 Water', hint: 'Tap W-hand or cup fingers near chin' },
  { sign: 'FOOD', label: '🍽️ Food', hint: 'Tap fingertips to lips repeatedly' },
  { sign: 'TIME', label: '⏱️ Time', hint: 'Tap index finger on opposite wrist' },
  { sign: 'STOP', label: '✋ Stop', hint: 'Hold open flat palm facing forward' },
];

export function SignToConversation({ onNewConversation }) {
  // Recognition states
  const [recognizedSign, setRecognizedSign] = useState(null);
  const [englishCaption, setEnglishCaption] = useState('');
  const [teluguTranslation, setTeluguTranslation] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [category, setCategory] = useState(null);
  const [recognitionStatus, setRecognitionStatus] = useState('Camera idle. Click "Start Camera" to begin.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [recentSigns, setRecentSigns] = useState([]);
  const [lastLatency, setLastLatency] = useState(null);

  // Auto-scan vs manual scan modes (default to manual scan to prevent 429 quota exhaustion)
  const [isAutoScan, setIsAutoScan] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  // Vision Sensitivity: 'high' (0.38), 'balanced' (0.48), 'strict' (0.65)
  const [sensitivity, setSensitivity] = useState('balanced');
  const [activeSignTip, setActiveSignTip] = useState(null);

  // Audio / Speech output options
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakLanguage, setSpeakLanguage] = useState('en'); // 'en' or 'te'

  // Temporal frame buffer (stores recent 3-5 frames)
  const frameBufferRef = useRef([]);
  const previousSignRef = useRef(null);
  const lastInferenceTimeRef = useRef(0);

  const { speakText, stopSpeaking, isSpeaking } = useSpeech();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const interval = setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSec]);

  // Frame capture handler triggered by useCamera hook at ~2 fps
  const handleFrameCaptured = useCallback((base64Frame) => {
    // Add to buffer (keep last 4 frames)
    frameBufferRef.current.push(base64Frame);
    if (frameBufferRef.current.length > 4) {
      frameBufferRef.current.shift();
    }
  }, []);

  const {
    videoRef,
    isActive,
    isLoading,
    error: cameraError,
    startCamera,
    stopCamera,
    captureFrame,
    switchFacingMode,
  } = useCamera({ onFrameCaptured: handleFrameCaptured, fps: 2 });

  // Core inference runner
  const runInference = useCallback(async (isManualTrigger = true) => {
    // Capture the immediate current live frame
    const currentFrame = captureFrame ? captureFrame() : null;
    let framesToSend = [];

    if (frameBufferRef.current.length > 0) {
      // Provide onset frame from recent buffer
      framesToSend.push(frameBufferRef.current[0]);
    }
    if (currentFrame) {
      framesToSend.push(currentFrame);
    } else if (frameBufferRef.current.length > 0) {
      framesToSend.push(frameBufferRef.current[frameBufferRef.current.length - 1]);
    }

    if (framesToSend.length === 0) {
      setRecognitionStatus('Starting video stream... please make sure camera is active.');
      return;
    }

    try {
      setIsProcessing(true);
      lastInferenceTimeRef.current = Date.now();
      setRecognitionStatus('Analyzing ISL gesture with Vision AI...');

      const thresholdMap = { high: 0.38, balanced: 0.48, strict: 0.65 };
      const chosenThreshold = thresholdMap[sensitivity] || 0.48;

      const res = await api.signToConversation(
        framesToSend,
        chosenThreshold,
        previousSignRef.current,
        isManualTrigger
      );

      if (res.cooldown_sec) {
        setCooldownSec(res.cooldown_sec);
      }

      if (res.latency_ms) {
        setLastLatency(res.latency_ms);
      }

      if (res.rate_limited) {
        // Pause auto-scan on rate limit so user isn't stuck in quota loop
        setIsAutoScan(false);
        setRecognitionStatus(res.status_message || 'Quota rate limit cooling down...');
        setIsProcessing(false);
        return;
      }

      if (res.recognized && res.sign) {
        const speedText = res.latency_ms ? ` (${res.latency_ms}ms)` : '';
        setRecognitionStatus(`Recognized: ${res.sign}${speedText}`);
        setRecognizedSign(res.sign);
        setEnglishCaption(res.english_caption || res.sign);
        setTeluguTranslation(res.telugu_translation || '');
        setConfidence(res.confidence || 0.85);
        setCategory(res.category || 'general');
        setErrorMessage(null);

        // Append to history if new sign or manually triggered
        if (res.is_new_sign || isManualTrigger) {
          const entry = {
            id: Date.now(),
            sign: res.sign,
            english: res.english_caption || res.sign,
            telugu: res.telugu_translation || '',
            confidence: res.confidence || 0.85,
            category: res.category || 'general',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };

          setRecentSigns((prev) => [entry, ...prev.slice(0, 19)]);
          previousSignRef.current = res.sign;

          if (onNewConversation) {
            onNewConversation(entry);
          }

          // Auto-speak if enabled
          if (autoSpeak) {
            const textToSpeak = speakLanguage === 'te' && res.telugu_translation ? res.telugu_translation : (res.english_caption || res.sign);
            speakText(textToSpeak, speakLanguage);
          }
        }
      } else {
        setRecognitionStatus(res.status_message || 'Scanning camera for signs...');
        if (res.status_message?.includes('not configured')) {
          setErrorMessage(res.status_message);
        }
      }
    } catch (err) {
      console.warn('Sign recognition inference notice:', err);
      setRecognitionStatus('AI vision temporarily cooling down. Retrying...');
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, sensitivity, autoSpeak, speakLanguage, speakText, onNewConversation]);

  // Periodic trigger for Auto-scan mode (safe 14s interval to respect free-tier quotas)
  useEffect(() => {
    if (!isAutoScan || !isActive || isProcessing || cooldownSec > 0) {
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      if (now - lastInferenceTimeRef.current >= 14000) {
        runInference(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoScan, isActive, isProcessing, cooldownSec, runInference]);

  // Keyboard shortcut: Spacebar triggers recognition when camera is active (manual trigger bypasses cooldown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && isActive && !isProcessing && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        runInference(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isProcessing, runInference]);

  const handleStart = async () => {
    setErrorMessage(null);
    setRecognitionStatus('Initializing camera...');
    const ok = await startCamera();
    if (ok) {
      setRecognitionStatus('Camera active. Sign clearly and tap "Recognize Sign" (or Space).');
    } else {
      setRecognitionStatus('Camera unavailable');
    }
  };

  const handleStop = () => {
    stopCamera();
    frameBufferRef.current = [];
    previousSignRef.current = null;
    setRecognitionStatus('Camera stopped');
  };

  const handleClearHistory = () => {
    setRecentSigns([]);
    setRecognizedSign(null);
    setEnglishCaption('');
    setTeluguTranslation('');
    setConfidence(null);
  };

  const handleManualSpeak = () => {
    const textToSpeak = speakLanguage === 'te' && teluguTranslation ? teluguTranslation : englishCaption;
    if (textToSpeak) {
      speakText(textToSpeak, speakLanguage);
    }
  };

  return (
    <div id="sign-to-conversation-section" className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Mode A
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Sign to Conversation</h2>
          </div>
          <p className="text-sm text-slate-400">
            Perform Indian Sign Language in front of your camera to generate live bilingual captions and voice output.
          </p>
        </div>

        {/* Camera Control Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isActive ? (
            <button
              id="start-camera-main-btn"
              onClick={handleStart}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium shadow-md shadow-teal-950/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Start Camera
            </button>
          ) : (
            <button
              id="stop-camera-main-btn"
              onClick={handleStop}
              className="px-5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CameraOff className="w-4 h-4" />
              Stop Camera
            </button>
          )}
        </div>
      </div>

      {/* Grid: Camera Stream & Live Recognition Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Live Camera Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <CameraPanel
            videoRef={videoRef}
            isActive={isActive}
            isLoading={isLoading}
            error={cameraError}
            onStart={handleStart}
            onStop={handleStop}
            onSwitchCamera={switchFacingMode}
            isProcessing={isProcessing}
            lastRecognizedSign={recognizedSign}
          />

          {/* Action Row: Recognize Gesture Trigger & Mode Controls */}
          {isActive && (
            <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  id="manual-recognize-btn"
                  onClick={() => runInference(true)}
                  disabled={isProcessing}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isProcessing
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-950/40 active:scale-[0.99]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing Gesture...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Recognize Sign (Space)</span>
                    </>
                  )}
                </button>

                {/* Auto-Scan Mode Toggle */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                      <Scan className="w-3 h-3 text-cyan-400" />
                      Auto-Scan
                    </span>
                    <span className="text-[10px] text-slate-500">14s safe interval</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAutoScan(!isAutoScan)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      isAutoScan ? 'bg-cyan-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isAutoScan ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sensitivity Selector */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/50 text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-teal-400" />
                  Recognition Sensitivity:
                </span>
                <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { key: 'high', label: 'High (0.38)', title: 'Best for low light or rapid signs' },
                    { key: 'balanced', label: 'Balanced (0.48)', title: 'Recommended for standard signing' },
                    { key: 'strict', label: 'Strict (0.65)', title: 'Minimal false positives' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSensitivity(s.key)}
                      title={s.title}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        sensitivity === s.key
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Gesture Cheat-Sheet */}
          <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Popular ISL Signs (Click for gesture hint)
              </span>
              <span className="text-[10px] text-slate-400">12 Quick Signs</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_ISL_SIGNS.map((item) => (
                <button
                  key={item.sign}
                  onClick={() => setActiveSignTip(activeSignTip?.sign === item.sign ? null : item)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border ${
                    activeSignTip?.sign === item.sign
                      ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                      : 'bg-slate-900/60 hover:bg-slate-700/60 border-slate-700/70 text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {activeSignTip && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-teal-950/40 border border-teal-800/50 flex items-start justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-teal-300">{activeSignTip.sign}:</span>{' '}
                  <span className="text-teal-100">{activeSignTip.hint}</span>
                </div>
                {isActive && (
                  <button
                    onClick={() => runInference(true)}
                    disabled={isProcessing || cooldownSec > 0}
                    className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium text-[11px] shrink-0"
                  >
                    Test Sign Now
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Camera Status Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="font-medium text-slate-300">{recognitionStatus}</span>
            </div>
            {lastLatency && (
              <span className="text-teal-400/90 text-[11px] font-mono">{lastLatency}ms</span>
            )}
          </div>

          {cooldownSec > 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Vision cooldown active (<strong>{cooldownSec}s</strong>).
                </span>
              </div>
              <button
                onClick={() => runInference(true)}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-medium transition-colors cursor-pointer shrink-0"
              >
                Recognize Now
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300 mb-0.5">Recognition Notice</p>
                <p className="text-amber-200/90">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Conversation Display (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 shadow-inner">
          <div className="flex flex-col gap-4">
            {/* Display Header with Clear Action */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Live Recognition Output</span>
              {recentSigns.length > 0 && (
                <button
                  id="clear-sign-history-btn"
                  onClick={handleClearHistory}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Active Recognized Card */}
            {recognizedSign ? (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-teal-500/40 shadow-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500 text-slate-950 text-xs font-black tracking-wide uppercase shadow-sm">
                      {recognizedSign}
                    </span>
                    {category && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {category}
                      </span>
                    )}
                  </div>
                  {confidence !== null && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {Math.round(confidence * 100)}% Match
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-medium">English Caption:</p>
                  <p className="text-lg font-bold text-white tracking-tight">{englishCaption || recognizedSign}</p>
                </div>

                {teluguTranslation && (
                  <div className="space-y-1 pt-2 border-t border-slate-800">
                    <p className="text-xs text-teal-400 font-medium">తెలుగు అనువాదం (Telugu):</p>
                    <p className="text-xl font-bold text-teal-300 font-telugu">{teluguTranslation}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-700 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-7 h-7 text-slate-600" />
                <p className="text-sm font-medium text-slate-300">Awaiting Sign Language Gesture</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Perform an ISL sign (e.g., HELLO, THANK YOU, PLEASE) in front of the camera and tap &quot;Recognize Sign&quot;.
                </p>
              </div>
            )}

            {/* Recent Gestures Feed */}
            {recentSigns.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Recent Stream</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {recentSigns.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-400 uppercase">{item.sign}</span>
                        <span className="text-slate-300">({item.english})</span>
                        {item.telugu && <span className="text-teal-300 font-telugu font-semibold">{item.telugu}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voice Output Controls Footer */}
          <div className="pt-4 border-t border-slate-700/60 flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-teal-400" />
                Voice Output
              </span>

              <div className="flex items-center gap-2">
                <button
                  id="toggle-auto-speak-btn"
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    autoSpeak
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {autoSpeak ? <Check className="w-3 h-3 stroke-3" /> : null}
                  Auto-Speak
                </button>

                <select
                  id="voice-language-select"
                  value={speakLanguage}
                  onChange={(e) => setSpeakLanguage(e.target.value)}
                  className="bg-slate-900 text-xs text-slate-300 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500"
                >
                  <option value="en">English Voice</option>
                  <option value="te">తెలుగు (Telugu Voice)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="speak-caption-btn"
                onClick={handleManualSpeak}
                disabled={!englishCaption && !teluguTranslation}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Speak Now
              </button>

              {isSpeaking && (
                <button
                  id="stop-speaking-btn"
                  onClick={stopSpeaking}
                  className="py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-xs font-medium text-rose-300 border border-rose-800/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  Stop Voice
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
