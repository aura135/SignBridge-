import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, User, Sparkles, BookOpen, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { ISLAvatar } from './ISLAvatar';
import { AvatarControls } from './AvatarControls';
import { useSpeech } from '../hooks/useSpeech';
import { api } from '../services/api';

export function ConversationToSign({ onNewConversation }) {
  const [inputText, setInputText] = useState('Hello, how are you?');
  const [sourceLanguage, setSourceLanguage] = useState('auto'); // 'auto', 'en', 'te'
  const [avatarGender, setAvatarGender] = useState('female');
  const [speed, setSpeed] = useState(1.0);

  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Avatar animation playback state
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);

  const timerRef = useRef(null);

  // Speech-to-text hook
  const { isListening, speechError, startListening, stopListening, recognitionLang, setRecognitionLang } = useSpeech({
    onTranscript: (text) => {
      setInputText(text);
    },
    onError: (err) => {
      setErrorMessage(err);
    },
  });

  // Handle translation and ISL sequence generation
  const handleTranslateToSign = useCallback(async (textToProcess = inputText) => {
    if (!textToProcess || !textToProcess.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await api.conversationToSign(
        textToProcess.trim(),
        sourceLanguage,
        avatarGender,
        speed
      );

      setResultData(data);
      setCurrentSignIndex(0);
      setIsPlaying(true);

      if (onNewConversation) {
        onNewConversation({
          id: Date.now(),
          mode: 'conversation_to_sign',
          english: data.english_text,
          telugu: data.telugu_text,
          signSequence: data.isl_sequence,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err) {
      console.error('Error translating text to sign:', err);
      setErrorMessage(err.message || 'Failed to generate ISL translation.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, sourceLanguage, avatarGender, speed, onNewConversation]);

  // Initial load with default sentence
  useEffect(() => {
    handleTranslateToSign('Hello, how are you?');
  }, []);

  // Avatar timeline progression loop
  useEffect(() => {
    if (!isPlaying || !resultData?.timeline || resultData.timeline.length === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const currentKeyframe = resultData.timeline[currentSignIndex];
    const duration = Math.max(650, (currentKeyframe?.duration_ms || 1200) / speed);

    timerRef.current = setTimeout(() => {
      setCurrentSignIndex((prev) => {
        if (prev < resultData.timeline.length - 1) {
          return prev + 1;
        } else if (isLooping) {
          return 0; // Seamless continuous replay
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, isLooping, currentSignIndex, resultData, speed]);

  const handlePlay = () => {
    if (resultData?.timeline && currentSignIndex >= resultData.timeline.length - 1) {
      setCurrentSignIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    setCurrentSignIndex(0);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    setCurrentSignIndex((prev) => Math.max(0, prev - 1));
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (resultData?.timeline) {
      setCurrentSignIndex((prev) => Math.min(resultData.timeline.length - 1, prev + 1));
      setIsPlaying(true);
    }
  };

  const handleSelectSign = (index) => {
    setCurrentSignIndex(index);
    setIsPlaying(true);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      const lang = sourceLanguage === 'te' ? 'te-IN' : 'en-IN';
      setRecognitionLang(lang);
      startListening(lang);
    }
  };

  const activeKeyframe = resultData?.timeline ? resultData.timeline[currentSignIndex] : null;
  const totalSigns = resultData?.timeline?.length || 0;
  const currentSignName = resultData?.isl_sequence ? resultData.isl_sequence[currentSignIndex] : '';
  const nextSignName = resultData?.isl_sequence && currentSignIndex < totalSigns - 1 ? resultData.isl_sequence[currentSignIndex + 1] : '';

  return (
    <div id="conversation-to-sign-section" className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Mode B
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Conversation to Sign</h2>
          </div>
          <p className="text-sm text-slate-400">
            Type or speak in English or Telugu to watch the realistic human avatar translate and perform Indian Sign Language.
          </p>
        </div>

        {/* Avatar Gender Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-center">
          <button
            onClick={() => setAvatarGender('female')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              avatarGender === 'female'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Female Signer
          </button>
          <button
            onClick={() => setAvatarGender('male')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              avatarGender === 'male'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Male Signer
          </button>
        </div>
      </div>

      {/* Grid: Human Avatar Signing Canvas & Controls (7 cols) + Language Processing (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Realistic Avatar Stage & Transport Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <ISLAvatar
            activeKeyframe={activeKeyframe}
            gender={avatarGender}
            isPlaying={isPlaying}
            speed={speed}
          />

          <AvatarControls
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onRestart={handleRestart}
            onPrevious={handlePrevious}
            onNext={handleNext}
            speed={speed}
            onSpeedChange={(newSpeed) => setSpeed(newSpeed)}
            currentIndex={currentSignIndex}
            totalSigns={totalSigns}
            currentSignName={currentSignName}
            nextSignName={nextSignName}
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping((prev) => !prev)}
          />
        </div>

        {/* Right Column: Text/Voice Input & ISL Grammar Analysis (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 shadow-inner">
          <div className="flex flex-col gap-4">
            {/* Input Form */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="isl-input-textarea" className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Enter English or Telugu
                </label>
                <div className="flex items-center gap-1">
                  <select
                    id="source-language-select"
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="bg-slate-900 text-[11px] text-slate-300 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="auto">Auto Detect Language</option>
                    <option value="en">English Input</option>
                    <option value="te">తెలుగు (Telugu Input)</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="isl-input-textarea"
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTranslateToSign();
                    }
                  }}
                  placeholder="e.g. Hello, how are you? or మీరు ఎలా ఉన్నారు?"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none pr-12"
                />

                {/* Microphone Record Button */}
                <button
                  id="toggle-mic-btn"
                  onClick={toggleListening}
                  title={isListening ? 'Stop Listening' : 'Start Microphone'}
                  className={`absolute right-3 top-3 p-2 rounded-xl transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-950/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {isListening && (
                <div className="flex items-center gap-2 text-xs text-rose-400 font-medium px-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Listening live in {sourceLanguage === 'te' ? 'Telugu (te-IN)' : 'English (en-IN)'}... Speak clearly.
                </div>
              )}

              {/* Sample Quick Phrases */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-500">Quick Signs:</span>
                {[
                  'Hello, how are you?',
                  'మీరు ఎలా ఉన్నారు?',
                  'Please help me',
                  'Where is hospital?',
                  'Thank you very much',
                ].map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => {
                      setInputText(phrase);
                      handleTranslateToSign(phrase);
                    }}
                    className="text-[11px] bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 rounded-md px-2 py-0.5 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* Action Submit Button */}
              <button
                id="translate-to-sign-btn"
                onClick={() => handleTranslateToSign()}
                disabled={isLoading || !inputText.trim()}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Translate to ISL & Sign
                  </>
                )}
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ISL Sequence Breakdown Chips */}
            {resultData?.isl_sequence && resultData.isl_sequence.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    ISL Sign Sequence (Grammar Ordered)
                  </span>
                  <span className="text-[10px] text-slate-400">{resultData.isl_sequence.length} Signs</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {resultData.isl_sequence.map((sign, idx) => {
                    const isCurrent = idx === currentSignIndex;
                    return (
                      <button
                        key={`${sign}-${idx}`}
                        onClick={() => handleSelectSign(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                          isCurrent
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-105'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isCurrent && <Check className="w-3 h-3 stroke-3" />}
                        {sign}
                      </button>
                    );
                  })}
                </div>

                {/* Grammatical Structure Details */}
                {resultData.isl_grammar_structure && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-300">Grammar Rule: </span>
                    {resultData.isl_grammar_structure}
                  </div>
                )}

                {/* Bilingual Alignments */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">English</span>
                    <p className="text-slate-200 font-medium">{resultData.english_text}</p>
                  </div>
                  {resultData.telugu_text && (
                    <div>
                      <span className="text-[10px] text-teal-500 uppercase font-semibold">తెలుగు (Telugu)</span>
                      <p className="text-teal-300 font-medium font-telugu">{resultData.telugu_text}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
