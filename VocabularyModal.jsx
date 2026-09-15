import React, { useState, useEffect } from 'react';
import { X, Search, BookOpen, Layers, Volume2 } from 'lucide-react';
import { api } from '../services/api';
import { useSpeech } from '../hooks/useSpeech';

export function VocabularyModal({ isOpen, onClose, onSelectSign }) {
  const [signs, setSigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { speakText } = useSpeech();

  useEffect(() => {
    if (!isOpen) return;

    const fetchVocab = async () => {
      try {
        setIsLoading(true);
        const res = await api.getVocabulary(selectedCategory, searchQuery);
        setSigns(res.signs || []);

        if (categories.length === 0) {
          const allRes = await api.getVocabulary('all', '');
          const cats = Array.from(new Set((allRes.signs || []).map((s) => s.category))).filter(Boolean);
          setCategories(cats);
        }
      } catch (err) {
        console.error('Error fetching vocabulary:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVocab();
  }, [isOpen, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Indian Sign Language (ISL) Vocabulary</h3>
              <p className="text-xs text-slate-400">
                150+ verified signs categorized with handshapes, movements, English, and Telugu translations.
              </p>
            </div>
          </div>

          <button
            id="close-vocab-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search sign, English or Telugu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Signs ({signs.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 capitalize transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Signs Grid */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-400">Loading ISL vocabulary...</p>
            </div>
          ) : signs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No signs matched &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {signs.map((item) => (
                <div
                  key={item.gloss}
                  className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-teal-500/50 transition-all flex flex-col justify-between gap-2.5 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-semibold uppercase">
                        {item.category}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1 group-hover:text-teal-300 transition-colors">
                        {item.gloss}
                      </h4>
                    </div>

                    <button
                      onClick={() => speakText(item.english, 'en')}
                      title="Speak"
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p className="text-slate-300">
                      <span className="text-slate-500">English:</span> {item.english}
                    </p>
                    <p className="text-teal-300 font-telugu font-semibold">
                      <span className="text-teal-600 font-sans">Telugu:</span> {item.telugu}
                    </p>
                  </div>

                  {item.movement && (
                    <p className="text-[11px] text-slate-400/90 leading-tight bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-500 font-semibold">Motion:</span> {item.movement}
                    </p>
                  )}

                  {onSelectSign && (
                    <button
                      onClick={() => {
                        onSelectSign(item);
                        onClose();
                      }}
                      className="mt-1 w-full py-1.5 text-center text-xs font-semibold rounded-lg bg-slate-700/50 hover:bg-teal-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Demonstrate in Avatar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
