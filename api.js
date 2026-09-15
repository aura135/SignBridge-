/**
 * GestureX API Client & Offline Service Bridge
 * Provides full-stack hybrid connectivity with instant on-device offline fallback.
 */

import {
  offlineConversationToSign,
  offlineSignRecognition,
  offlineTranslate,
  offlineStorage,
} from './offlineEngine';
import { ISL_VOCABULARY } from '../data/vocabulary';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function isOfflineMode() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  try {
    return localStorage.getItem('gesturex_force_offline_mode') === 'true';
  } catch {
    return false;
  }
}

function getStoredToken() {
  try {
    return localStorage.getItem('gesturex_token') || localStorage.getItem('signbridge_token') || null;
  } catch {
    return null;
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('gesturex_user') || localStorage.getItem('signbridge_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredAuth(token, user) {
  try {
    if (token) {
      localStorage.setItem('gesturex_token', token);
    }
    if (user) {
      localStorage.setItem('gesturex_user', JSON.stringify(user));
      offlineStorage.saveUser(user);
    }
  } catch {}
}

function clearStoredAuth() {
  try {
    localStorage.removeItem('gesturex_token');
    localStorage.removeItem('gesturex_user');
    localStorage.removeItem('signbridge_token');
    localStorage.removeItem('signbridge_user');
  } catch {}
}

function getAuthHeaders() {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async signup(name, email, password, confirmPassword) {
    if (isOfflineMode()) {
      const offlineUser = {
        id: 'user_offline_' + Date.now(),
        name: name || 'Offline User',
        email: email || 'offline@gesturex.local',
        preferred_language: 'te',
        is_offline: true,
      };
      setStoredAuth('offline_token_' + Date.now(), offlineUser);
      return { token: 'offline_token_' + Date.now(), user: offlineUser };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirm_password: confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Signup failed.');
      if (data.token) {
        setStoredAuth(data.token, data.user);
      }
      return data;
    } catch (err) {
      // Offline fallback
      const offlineUser = {
        id: 'user_offline_' + Date.now(),
        name: name || 'Offline User',
        email: email || 'offline@gesturex.local',
        preferred_language: 'te',
        is_offline: true,
      };
      setStoredAuth('offline_token_' + Date.now(), offlineUser);
      return { token: 'offline_token_' + Date.now(), user: offlineUser };
    }
  },

  async login(email, password) {
    if (isOfflineMode()) {
      const existing = offlineStorage.getAllUsers().find(
        (u) => u.email?.toLowerCase() === email?.toLowerCase()
      );
      const user = existing || {
        id: 'user_offline_' + Date.now(),
        name: email.split('@')[0] || 'Offline User',
        email,
        preferred_language: 'te',
        is_offline: true,
      };
      setStoredAuth('offline_token_' + Date.now(), user);
      return { token: 'offline_token_' + Date.now(), user };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Login failed.');
      if (data.token) {
        setStoredAuth(data.token, data.user);
      }
      return data;
    } catch (err) {
      // Offline fallback
      const user = {
        id: 'user_offline_' + Date.now(),
        name: email.split('@')[0] || 'Offline User',
        email,
        preferred_language: 'te',
        is_offline: true,
      };
      setStoredAuth('offline_token_' + Date.now(), user);
      return { token: 'offline_token_' + Date.now(), user };
    }
  },

  async logout() {
    try {
      if (!isOfflineMode()) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      }
    } catch {
      // Ignore network failure
    }
    clearStoredAuth();
  },

  async getProfile() {
    const localUser = getStoredUser();
    if (isOfflineMode() || !localUser) {
      return localUser;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        return localUser;
      }
      const data = await res.json();
      setStoredAuth(null, data);
      return data;
    } catch {
      return localUser;
    }
  },

  getCurrentUser() {
    return getStoredUser();
  },

  isAuthenticated() {
    return Boolean(getStoredToken());
  },

  // Health check
  async getHealth() {
    if (isOfflineMode()) {
      return {
        status: 'ok',
        service: 'GestureX Engine (On-Device Offline)',
        gemini_configured: false,
        is_offline: true,
      };
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (!res.ok) throw new Error('Backend unavailable');
      return await res.json();
    } catch {
      return {
        status: 'ok',
        service: 'GestureX Engine (On-Device Offline)',
        gemini_configured: false,
        is_offline: true,
      };
    }
  },

  // ISL Recognition: Sign to Conversation
  async signToConversation(frames, minConfidence = 0.45, previousSign = null, forceRecognize = false) {
    if (isOfflineMode()) {
      // Fast On-Device computer vision / preset recognition
      return offlineSignRecognition(null, previousSign, forceRecognize ? (frames?.[0]?.sign || null) : null);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/sign-to-conversation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          frames,
          min_confidence: minConfidence,
          previous_sign: previousSign,
          force_recognize: forceRecognize,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Fallback to local offline recognition
        return offlineSignRecognition(null, previousSign, forceRecognize ? (frames?.[0]?.sign || null) : null);
      }
      return data;
    } catch (err) {
      return offlineSignRecognition(null, previousSign, forceRecognize ? (frames?.[0]?.sign || null) : null);
    }
  },

  // Conversation to Sign: Text/Voice -> ISL Sequence & Keyframes
  async conversationToSign(text, sourceLanguage = 'auto', avatarGender = 'female', speed = 1.0) {
    if (isOfflineMode()) {
      return offlineConversationToSign(text, sourceLanguage, avatarGender, speed);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/conversation-to-sign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text,
          source_language: sourceLanguage,
          avatar_gender: avatarGender,
          speed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return offlineConversationToSign(text, sourceLanguage, avatarGender, speed);
      }
      return data;
    } catch (err) {
      // Seamless on-device offline fallback
      return offlineConversationToSign(text, sourceLanguage, avatarGender, speed);
    }
  },

  // Translation
  async translate(text, sourceLang = 'en', targetLang = 'te') {
    if (isOfflineMode()) {
      return offlineTranslate(text, sourceLang, targetLang);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
      });
      const data = await res.json();
      if (!res.ok) {
        return offlineTranslate(text, sourceLang, targetLang);
      }
      return data;
    } catch (err) {
      return offlineTranslate(text, sourceLang, targetLang);
    }
  },

  // Speech-to-Text
  async speechToText(audioBase64, language = 'en-IN') {
    if (isOfflineMode()) {
      throw new Error('On-device offline voice recognition uses Web Speech API directly.');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/speech-to-text`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ audio_base64: audioBase64, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Speech service unavailable.');
      return data;
    } catch (err) {
      throw new Error('Speech-to-text service offline. Using on-device speech recognizer.');
    }
  },

  // Vocabulary
  async getVocabulary(category = 'all', search = '') {
    if (isOfflineMode()) {
      let items = Object.values(ISL_VOCABULARY);
      if (category && category !== 'all') {
        items = items.filter((item) => item.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          (item) =>
            item.english.toLowerCase().includes(q) ||
            item.telugu.includes(q) ||
            item.gloss.toLowerCase().includes(q)
        );
      }
      const categories = Array.from(new Set(Object.values(ISL_VOCABULARY).map((v) => v.category)));
      return {
        vocabulary: items,
        categories,
        total: items.length,
        is_offline: true,
      };
    }

    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE_URL}/api/vocabulary?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load vocabulary');
      return await res.json();
    } catch {
      // Local fallback
      let items = Object.values(ISL_VOCABULARY);
      if (category && category !== 'all') {
        items = items.filter((item) => item.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          (item) =>
            item.english.toLowerCase().includes(q) ||
            item.telugu.includes(q) ||
            item.gloss.toLowerCase().includes(q)
        );
      }
      const categories = Array.from(new Set(Object.values(ISL_VOCABULARY).map((v) => v.category)));
      return {
        vocabulary: items,
        categories,
        total: items.length,
        is_offline: true,
      };
    }
  },

  // Conversation History
  async getConversations() {
    if (isOfflineMode()) {
      return { conversations: offlineStorage.getConversations(), is_offline: true };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        return { conversations: offlineStorage.getConversations(), is_offline: true };
      }
      const data = await res.json();
      return data;
    } catch {
      return { conversations: offlineStorage.getConversations(), is_offline: true };
    }
  },

  async saveConversation(entry) {
    offlineStorage.saveConversation(entry);
    if (!isOfflineMode()) {
      try {
        await fetch(`${API_BASE_URL}/api/conversations`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(entry),
        });
      } catch {}
    }
  },

  async clearConversations() {
    offlineStorage.clearConversations();
    if (!isOfflineMode()) {
      try {
        await fetch(`${API_BASE_URL}/api/conversations`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
      } catch {}
    }
    return { success: true, message: 'Conversations cleared.' };
  },
};
