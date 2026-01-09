import { useState, useEffect } from 'react';

export function usePWA() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        return { success: true, message: '🎉 App installed successfully!' };
      } else {
        return { success: false, message: 'Installation cancelled' };
      }
    } catch (error) {
      return { success: false, message: 'Installation failed' };
    } finally {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
  };

  return {
    showInstallPrompt,
    isInstalled,
    installPWA,
    dismissInstallPrompt
  };
}
