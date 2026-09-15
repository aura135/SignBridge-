import React from 'react';
import { Camera, CameraOff, RefreshCw, AlertCircle, Eye } from 'lucide-react';

export function CameraPanel({
  videoRef,
  isActive,
  isLoading,
  error,
  onStart,
  onStop,
  onSwitchCamera,
  isProcessing,
  lastRecognizedSign,
}) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl flex flex-col items-center justify-center min-h-[320px] sm:min-h-[380px]">
      {/* Live Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover aspect-video transform scale-x-[-1] transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
      />

      {/* Camera Off / Idle State */}
      {!isActive && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md z-10">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
            <CameraOff className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-1">Camera Inactive</h3>
          <p className="text-sm text-slate-400 mb-6">
            Click &ldquo;Start Camera&rdquo; to allow video access and begin real-time Indian Sign Language gesture recognition.
          </p>
          <button
            id="start-camera-idle-btn"
            onClick={onStart}
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-lg shadow-teal-900/40 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            Start Camera
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center z-20">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-300 font-medium">Requesting camera permissions...</p>
        </div>
      )}

      {/* Error state */}
      {error && !isActive && (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center text-red-400 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-red-300 mb-1">Camera Access Issue</h4>
          <p className="text-xs text-red-200/80 max-w-sm mb-4 leading-relaxed">{error}</p>
          <button
            id="retry-camera-btn"
            onClick={onStart}
            className="px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Overlay controls & HUD when Camera is Active */}
      {isActive && (
        <>
          {/* Facial & Hand Alignment Silhouette Guide */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 opacity-35">
            <div className="w-48 h-56 border-2 border-dashed border-teal-400/60 rounded-full mb-3 flex items-center justify-center">
              <span className="text-[11px] font-medium tracking-wider text-teal-300 uppercase bg-slate-900/70 px-2 py-0.5 rounded">Face & Chest Zone</span>
            </div>
            <div className="flex justify-between w-72">
              <div className="w-20 h-20 border border-dashed border-cyan-400/50 rounded-lg flex items-center justify-center text-[10px] text-cyan-300">Left Hand</div>
              <div className="w-20 h-20 border border-dashed border-cyan-400/50 rounded-lg flex items-center justify-center text-[10px] text-cyan-300">Right Hand</div>
            </div>
          </div>

          {/* Top Status Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-full px-3 py-1.5 shadow-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isProcessing ? 'bg-teal-400' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isProcessing ? 'bg-teal-500' : 'bg-emerald-500'}`} />
              </span>
              <span className="text-xs font-medium text-slate-200">
                {isProcessing ? 'Analyzing ISL frames...' : 'Live Feed Active'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="switch-camera-btn"
                onClick={onSwitchCamera}
                title="Switch Camera"
                className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 flex items-center justify-center shadow-md transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Overlay Toast if recognized */}
          {lastRecognizedSign && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-md border border-teal-500/50 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-3 animate-fadeIn">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Sign:</span>
                <span className="text-sm font-bold text-teal-300">{lastRecognizedSign}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
