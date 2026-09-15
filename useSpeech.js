import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useSpeech({ onTranscript, onError } = {}) {
  // Speech Recognition state (Microphone input)
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [recognitionLang, setRecognitionLang] = useState('en-IN');
  const [isSTTSupported, setIsSTTSupported] = useState(true);

  // Speech Synthesis state (Voice output)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Load available synthesis voices
  const updateVoices = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      // Try to find native English (India) or Telugu voice
      const preferred = voices.find((v) => v.lang.includes('te') || v.lang === 'te-IN') ||
        voices.find((v) => v.lang === 'en-IN') ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
      setSelectedVoice(preferred || null);
    }
  }, []);

  useEffect(() => {
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [updateVoices]);

  // Voice Output: speak text
  const speakText = useCallback((text, lang = 'en') => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (lang === 'te' || /[\u0C00-\u0C7F]/.test(text)) {
      utterance.lang = 'te-IN';
      const teVoice = voices.find((v) => v.lang.includes('te') || v.lang === 'te-IN');
      if (teVoice) utterance.voice = teVoice;
    } else {
      utterance.lang = 'en-IN';
      const enVoice = voices.find((v) => v.lang === 'en-IN') ||
        voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Browser Speech Recognition (Web Speech API)
  const startListening = useCallback(async (lang = recognitionLang) => {
    setSpeechError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }

        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (onTranscript && currentTranscript) {
            onTranscript(currentTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          let msg = 'Microphone unavailable or permission denied.';
          if (event.error === 'not-allowed') {
            msg = 'Microphone permission denied. Please allow microphone access.';
          } else if (event.error === 'no-speech') {
            msg = 'No speech detected. Please speak clearly into the microphone.';
          }
          setSpeechError(msg);
          if (onError) onError(msg);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Web Speech API failed, trying media recorder fallback:', err);
      }
    }

    // Fallback: Use MediaRecorder & backend speech-to-text API adapter
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());

          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result;
            try {
              const res = await api.speechToText(base64Audio, lang);
              if (res.transcript && onTranscript) {
                onTranscript(res.transcript);
              }
            } catch (backendErr) {
              const msg = backendErr.message || 'Speech-to-text service unavailable.';
              setSpeechError(msg);
              if (onError) onError(msg);
            }
          };
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        const msg = 'Microphone unavailable or permission denied.';
        setSpeechError(msg);
        if (onError) onError(msg);
        setIsListening(false);
      }
    } else {
      const msg = 'Microphone unavailable or permission denied.';
      setSpeechError(msg);
      setIsSTTSupported(false);
      if (onError) onError(msg);
    }
  }, [recognitionLang, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    speechError,
    recognitionLang,
    setRecognitionLang,
    isSTTSupported,
    startListening,
    stopListening,
    isSpeaking,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    speakText,
    stopSpeaking,
  };
}
