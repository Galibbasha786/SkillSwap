// hooks/usePWAInstall.jsx
import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event for later use
      setDeferredPrompt(e);
      // Show your custom install prompt
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    if (window.navigator.standalone === true) {
      setShowInstallPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  return {
    showInstallPrompt,
    handleInstall,
    handleDismiss,
    canInstall: deferredPrompt !== null
  };
};
