import React from 'react';
import { WifiOff, Wifi, Zap, ShieldCheck } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isNetworkOnline, isForcedOffline, toggleForceOffline } = useOnlineStatus();

  return (
    <>
      {/* Top / Floating notification banner when offline */}
      {!isOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-amber-950/90 border border-amber-500/50 px-4 py-2 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur-xl animate-fadeIn max-w-md w-[92%] sm:w-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <div className="flex-1">
            <span>{isForcedOffline ? 'On-Device Offline Mode' : 'You are currently offline'}</span>
            <span className="hidden sm:inline text-amber-300/80 font-normal"> — GestureX local AI engine & vocabulary are active</span>
          </div>
          <button
            onClick={() => toggleForceOffline()}
            className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-700/60 transition cursor-pointer"
          >
            {isForcedOffline ? 'Switch Online' : 'Dismiss'}
          </button>
        </div>
      )}
    </>
  );
};

export const OfflineModeToggle: React.FC = () => {
  const { isOnline, isNetworkOnline, isForcedOffline, toggleForceOffline } = useOnlineStatus();

  return (
    <button
      onClick={() => toggleForceOffline()}
      title={isForcedOffline ? 'Currently forcing offline mode. Click to allow online AI' : 'Click to run in 100% offline mode (zero data usage)'}
      className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
        !isOnline
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/40'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Offline Ready</span>
        </>
      ) : (
        <>
          <Zap className="w-3.5 h-3.5 text-teal-400" />
          <span>Online / Hybrid</span>
        </>
      )}
    </button>
  );
};
