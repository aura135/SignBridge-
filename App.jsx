import React, { useState, useEffect } from 'react';
import { Communication } from './components/Communication.jsx';
import { Login } from './components/Login.jsx';
import { Signup } from './components/Signup.jsx';
import { api } from './services/api.js';
import { ArrowLeft } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('communication'); // 'communication', 'login', 'signup'

  useEffect(() => {
    const user = api.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    api.getProfile().then((p) => {
      if (p) setCurrentUser(p);
    }).catch(() => {});
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('communication');
  };

  const handleSignupSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('communication');
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentView('communication');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      <main className="flex-1 flex flex-col items-center justify-center">
        {currentView === 'communication' && (
          <Communication
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAuth={() => setCurrentView('login')}
          />
        )}

        {currentView === 'login' && (
          <div className="w-full max-w-lg px-4 py-12">
            <button
              onClick={() => setCurrentView('communication')}
              className="mb-4 text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Communication Studio
            </button>
            <Login
              onLoginSuccess={handleLoginSuccess}
              onSwitchToSignup={() => setCurrentView('signup')}
              onContinueAsGuest={() => setCurrentView('communication')}
            />
          </div>
        )}

        {currentView === 'signup' && (
          <div className="w-full max-w-lg px-4 py-12">
            <button
              onClick={() => setCurrentView('communication')}
              className="mb-4 text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Communication Studio
            </button>
            <Signup
              onSignupSuccess={handleSignupSuccess}
              onSwitchToLogin={() => setCurrentView('login')}
              onContinueAsGuest={() => setCurrentView('communication')}
            />
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>GestureX &bull; Two-Way Indian Sign Language (ISL) Platform &bull; INCLUDE-ISL Dataset</p>
          <p className="text-slate-400">Real-time Camera Recognition &bull; English &bull; తెలుగు (Telugu) &bull; 3D Human Signer Avatar</p>
        </div>
      </footer>
    </div>
  );
}
