import React from 'react';
import { Clock, Trash2, ArrowUpRight, ArrowDownLeft, Volume2, ShieldCheck, History } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

export function ConversationHistory({ conversations = [], onClear, onReplaySign }) {
  const { speakText } = useSpeech();

  if (!conversations || conversations.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <History className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-300">No Conversations Yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Perform signs with your camera or send messages to the avatar to record communication sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-bold text-white">Conversation History</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            {conversations.length} entries
          </span>
        </div>

        {onClear && (
          <button
            id="clear-all-conversations-btn"
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1.5 custom-scrollbar">
        {conversations.map((item, idx) => {
          const isSignToConv = item.mode === 'sign_to_conversation';
          return (
            <div
              key={item.id || idx}
              className="p-4 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isSignToConv
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {isSignToConv ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-400">
                      {isSignToConv ? 'Sign ➔ Conversation' : 'Conversation ➔ Sign'}
                    </span>
                    {item.recognized_sign && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-500 text-slate-950 text-xs font-black uppercase">
                        {item.recognized_sign}
                      </span>
                    )}
                    {item.confidence && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        <ShieldCheck className="w-3 h-3" />
                        {Math.round(item.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-medium text-slate-100">
                    {item.english_caption || item.raw_input || item.english}
                  </div>

                  {(item.telugu_translation || item.telugu) && (
                    <div className="text-sm font-semibold text-teal-300 font-telugu">
                      {item.telugu_translation || item.telugu}
                    </div>
                  )}

                  {item.sign_sequence && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500">ISL:</span>
                      {item.sign_sequence.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] font-bold bg-slate-900 border border-slate-700 text-cyan-300 px-1.5 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right metadata & actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => speakText(item.telugu_translation || item.english_caption || item.english || '', 'en')}
                    title="Speak Caption"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
