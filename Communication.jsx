import React, { useState, useEffect } from 'react';
import { Camera, MessageSquare, BookOpen, History, LogOut, User, Sparkles, Shield, ArrowDown, ExternalLink, Download } from 'lucide-react';
import { SignToConversation } from './SignToConversation';
import { ConversationToSign } from './ConversationToSign';
import { ConversationHistory } from './ConversationHistory';
import { VocabularyModal } from './VocabularyModal';
import { DownloadModal } from './DownloadModal';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineModeToggle } from './OfflineIndicator';
import { api } from '../services/api';

export function Communication({ currentUser, onLogout, onOpenAuth }) {
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.getConversations();
        const list = res?.conversations || res || [];
        setConversations(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('Could not load history:', err);
      }
    };
    fetchHistory();
  }, [currentUser]);

  const handleNewConversation = (entry) => {
    setConversations((prev) => [entry, ...prev]);
    api.saveConversation(entry);
  };

  const handleClearHistory = async () => {
    try {
      await api.clearConversations();
      setConversations([]);
    } catch {
      setConversations([]);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top App Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">GestureX</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold uppercase">
                ISL Two-Way
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase">
                Offline PWA
              </span>
            </div>
            <p className="text-xs text-slate-400">Offline-Ready Indian Sign Language Bilingual Communication Engine</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Offline Mode Toggle */}
          <OfflineModeToggle />

          {/* Quick Mode Jump Buttons */}
          <button
            onClick={() => scrollToSection('sign-to-conversation-section')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            Sign to Conversation
          </button>

          <button
            onClick={() => scrollToSection('conversation-to-sign-section')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            Conversation to Sign
          </button>

          <button
            id="open-vocab-btn"
            onClick={() => setIsVocabOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            ISL Signs (150+)
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showHistory
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({conversations.length})
          </button>

          <button
            id="open-downloads-btn"
            onClick={() => setIsDownloadOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600/90 to-cyan-600/90 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-950/50 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download ZIPs
          </button>

          {/* User Auth indicator */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-teal-500/50 flex items-center justify-center text-xs font-bold text-teal-300">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <button
                onClick={onLogout}
                title="Log out"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-md transition-colors cursor-pointer ml-1"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* History Drawer if toggled */}
      {showHistory && (
        <div className="animate-fadeIn">
          <ConversationHistory
            conversations={conversations}
            onClear={handleClearHistory}
          />
        </div>
      )}

      {/* SECTION 1: Sign to Conversation (Real Camera -> ISL Recognition -> English Caption -> Telugu Translation -> Voice Output) */}
      <section>
        <SignToConversation onNewConversation={handleNewConversation} />
      </section>

      {/* Visual Divider with Scroll Anchor */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="h-px bg-slate-800 flex-1" />
        <button
          onClick={() => scrollToSection('conversation-to-sign-section')}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 cursor-pointer"
        >
          <span>Scroll to Conversation to Sign</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <div className="h-px bg-slate-800 flex-1" />
      </div>

      {/* SECTION 2: Conversation to Sign (Text/Voice -> Language Processing -> ISL Grammar -> Animated Avatar Signing) */}
      <section>
        <ConversationToSign onNewConversation={handleNewConversation} />
      </section>

      {/* Vocabulary Modal */}
      <VocabularyModal
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
      />

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />
    </div>
  );
}
