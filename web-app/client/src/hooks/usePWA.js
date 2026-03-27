import { useState, useEffect } from 'react';

export function usePWA() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices using user agent + additional heuristics for reliability
    const iosDevice = (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // iPad on iOS 13+ reports itself as MacIntel but has touch support
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    ) && !window.MSStream;
    setIsIOS(iosDevice);

    // On iOS, show a manual "Add to Home Screen" prompt since beforeinstallprompt is not supported
    if (iosDevice) {
      setShowInstallPrompt(true);
      return;
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
    isIOS,
    installPWA,
    dismissInstallPrompt
  };
}
