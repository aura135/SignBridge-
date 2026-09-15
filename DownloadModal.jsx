import React from 'react';
import { X, Download, Archive, Terminal, CheckCircle2, FileCode, Layers, Server, Monitor } from 'lucide-react';

export function DownloadModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Download Source Code ZIPs</h2>
              <p className="text-xs text-slate-400">Separate Frontend &amp; Backend packages ready to extract and run</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Download Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Frontend Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-teal-500/30 flex flex-col justify-between hover:border-teal-500/60 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 uppercase tracking-wider flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> React 19 + Vite
                </span>
                <span className="text-xs text-slate-500 font-mono">~77 KB</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Frontend Package</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Complete React 19 application with ISL 3D Signer Avatar, MediaPipe Camera Hand-Tracking, Speech Synthesis, Telugu &amp; English bilingual UI, and PWA manifest.
              </p>

              <div className="space-y-1.5 mb-4 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>3D Parametric Human Signer Avatar (`ISLAvatar.jsx`)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Real-time Webcam Capture &amp; Speech Recognition</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>100% Offline-capable Local Synthesizer Engine</span>
                </div>
              </div>
            </div>

            <a
              href="/api/downloads/gesturex-frontend.zip"
              download="gesturex-frontend.zip"
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Frontend ZIP</span>
            </a>
          </div>

          {/* Backend Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 flex flex-col justify-between hover:border-cyan-500/60 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                  <Server className="w-3 h-3" /> Python FastAPI
                </span>
                <span className="text-xs text-slate-500 font-mono">~45 KB</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Backend Package</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Production-grade FastAPI server with INCLUDE-ISL dataset dictionary, Gemini Vision API, JWT authentication, and Telugu grammar translation services.
              </p>

              <div className="space-y-1.5 mb-4 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>FastAPI Endpoints &amp; Pydantic Schemas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Full 218+ Word ISL Dictionary (`isl_vocabulary.json`)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>SQLAlchemy Database Models &amp; SQLite/Postgres</span>
                </div>
              </div>
            </div>

            <a
              href="/api/downloads/gesturex-backend.zip"
              download="gesturex-backend.zip"
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Backend ZIP</span>
            </a>
          </div>
        </div>

        {/* Full-Stack Combined Option */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Full-Stack Unified Project ZIP</h4>
              <p className="text-xs text-slate-400">Everything in one single archive: Frontend, Python Backend, and Node/Express server</p>
            </div>
          </div>
          <a
            href="/api/downloads/gesturex-fullstack.zip"
            download="gesturex-fullstack.zip"
            className="w-full sm:w-auto py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All (Full-Stack)</span>
          </a>
        </div>

        {/* Quick Run Commands */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
            <Terminal className="w-4 h-4 text-teal-400" />
            <span>How to Run Locally</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-teal-400 font-bold block mb-1"># Frontend Setup</span>
              <p className="text-slate-400">unzip gesturex-frontend.zip</p>
              <p className="text-slate-400">npm install</p>
              <p className="text-slate-200 font-bold">npm run dev</p>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-cyan-400 font-bold block mb-1"># Python Backend Setup</span>
              <p className="text-slate-400">unzip gesturex-backend.zip</p>
              <p className="text-slate-400">pip install -r requirements.txt</p>
              <p className="text-slate-200 font-bold">uvicorn main:app --reload</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
