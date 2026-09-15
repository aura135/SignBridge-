import { useEffect, useState, useCallback } from 'react';

const OFFLINE_MODE_STORAGE_KEY = 'gesturex_force_offline_mode';

export function useOnlineStatus() {
  const [networkOnline, setNetworkOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  const [forceOffline, setForceOffline] = useState(() => {
    try {
      return localStorage.getItem(OFFLINE_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleForceOffline = useCallback((forced?: boolean) => {
    setForceOffline((prev) => {
      const next = typeof forced === 'boolean' ? forced : !prev;
      try {
        localStorage.setItem(OFFLINE_MODE_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // An app is effectively running offline if either real network is offline OR forced offline mode is active
  const isEffectiveOnline = networkOnline && !forceOffline;

  return {
    isOnline: isEffectiveOnline,
    isNetworkOnline: networkOnline,
    isForcedOffline: forceOffline,
    toggleForceOffline,
  };
}
