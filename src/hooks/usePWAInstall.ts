import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type IOSBrowserType = 'safari' | 'chrome_edge' | 'in_app' | 'other';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosBrowser, setIosBrowser] = useState<IOSBrowserType>('safari');

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsInstalled(checkStandalone());

    const ua = window.navigator.userAgent || '';
    const uaLower = ua.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(uaLower) ||
      (uaLower.includes('macintosh') && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      if (/whatsapp|fban|fbav|instagram|line|gsa|linkedin/i.test(ua)) {
        setIosBrowser('in_app');
      } else if (/crios|edgios|fxios|optios/i.test(ua)) {
        setIosBrowser('chrome_edge');
      } else if (/safari/i.test(ua)) {
        setIosBrowser('safari');
      } else {
        setIosBrowser('other');
      }
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => setIsInstalled(checkStandalone());
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    iosBrowser,
    install,
  };
}
