import React from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Gauge, Repeat } from 'lucide-react';

export function AvatarControls({
  isPlaying,
  onPlay,
  onPause,
  onRestart,
  onPrevious,
  onNext,
  speed,
  onSpeedChange,
  currentIndex,
  totalSigns,
  currentSignName,
  nextSignName,
  isLooping = false,
  onToggleLoop,
}) {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 backdrop-blur-md">
      {/* Top Status: Current Sign & Progress */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Signing:</span>
          <span className="font-bold text-teal-300 text-sm bg-teal-950/60 border border-teal-800/50 px-2 py-0.5 rounded-md">
            {currentSignName || 'IDLE'}
          </span>
          {nextSignName && (
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              (Next: <span className="text-slate-400">{nextSignName}</span>)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400 font-semibold">
          <span>{totalSigns > 0 ? currentIndex + 1 : 0}</span>
          <span>/</span>
          <span>{totalSigns}</span>
        </div>
      </div>

      {/* Progress timeline bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-teal-500 h-full transition-all duration-300 rounded-full"
          style={{
            width: totalSigns > 0 ? `${((currentIndex + 1) / totalSigns) * 100}%` : '0%',
          }}
        />
      </div>

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Playback Transport Controls */}
        <div className="flex items-center gap-1.5">
          <button
            id="avatar-restart-btn"
            onClick={onRestart}
            disabled={totalSigns === 0}
            title="Restart Animation"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onToggleLoop && (
            <button
              id="avatar-loop-btn"
              onClick={onToggleLoop}
              disabled={totalSigns === 0}
              title={isLooping ? "Continuous Loop Enabled" : "Enable Continuous Loop"}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isLooping
                  ? 'bg-teal-600/30 border-teal-500 text-teal-300'
                  : 'bg-slate-800 border-transparent hover:bg-slate-700 text-slate-400'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          )}

          <button
            id="avatar-prev-btn"
            onClick={onPrevious}
            disabled={totalSigns === 0 || currentIndex <= 0}
            title="Previous Sign"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {isPlaying ? (
            <button
              id="avatar-pause-btn"
              onClick={onPause}
              disabled={totalSigns === 0}
              title="Pause Animation"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-colors cursor-pointer text-xs"
            >
              <Pause className="w-4 h-4 fill-current" />
              Pause
            </button>
          ) : (
            <button
              id="avatar-play-btn"
              onClick={onPlay}
              disabled={totalSigns === 0}
              title="Play Animation"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-teal-950/40 transition-colors cursor-pointer text-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              Play
            </button>
          )}

          <button
            id="avatar-next-btn"
            onClick={onNext}
            disabled={totalSigns === 0 || currentIndex >= totalSigns - 1}
            title="Next Sign"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Adjustment Control */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Speed:</span>
          </div>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700/60">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  speed === s
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
