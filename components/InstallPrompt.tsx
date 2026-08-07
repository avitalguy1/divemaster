'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const inStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(inStandaloneMode);

    // Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Listen for Chrome / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted PWA installation');
    } else {
      console.log('User dismissed PWA installation');
    }

    setDeferredPrompt(null);
  };

  // Don't render banner if already installed or dismissed by user
  if (isStandalone || isDismissed) {
    return null;
  }

  // Display prompt for Android/Desktop Chrome when install event fires
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
        <Card className="bg-slate-900 border-sky-500/40 text-white p-4 shadow-2xl rounded-2xl flex items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-black text-white text-base shadow-md shadow-sky-500/30 flex-shrink-0">
              DM
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Install DiveMaster App</h4>
              <p className="text-xs text-sky-200">Add to home screen for instant full-screen app access</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md"
            >
              Install
            </Button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white text-sm p-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Display iOS instructions banner if on iOS device and not standalone
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
        <Card className="bg-slate-900 border-sky-500/40 text-white p-4 shadow-2xl rounded-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-black text-white text-base shadow-md shadow-sky-500/30 flex-shrink-0">
              DM
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Install DiveMaster App</h4>
              <p className="text-xs text-sky-200">
                Tap <span className="font-bold text-white">Share ⎋</span> and select <span className="font-bold text-white">Add to Home Screen ➕</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white text-sm p-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </Card>
      </div>
    );
  }

  return null;
}
