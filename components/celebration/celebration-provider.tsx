'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CelebrationTier } from '@/lib/celebrations/tier';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface CelebrationContextType {
  reduceCelebrations: boolean;
  setReduceCelebrations: (val: boolean) => void;
  triggerCelebration: (tier: CelebrationTier, title?: string) => void;
}

const CelebrationContext = createContext<CelebrationContextType>({
  reduceCelebrations: false,
  setReduceCelebrations: () => {},
  triggerCelebration: () => {},
});

export function useCelebration() {
  return useContext(CelebrationContext);
}

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [reduceCelebrations, setReduceCelebrations] = useState(false);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string; tier: CelebrationTier } | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef = useRef<any>(null);

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize canvas-confetti instance with dynamic import for SSR safety
  useEffect(() => {
    let isMounted = true;
    if (canvasRef.current && !confettiInstanceRef.current) {
      import('canvas-confetti')
        .then((module) => {
          const createConfetti = module.default || module;
          if (isMounted && canvasRef.current && typeof createConfetti.create === 'function') {
            confettiInstanceRef.current = createConfetti.create(canvasRef.current, {
              resize: true,
              useWorker: true,
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
      if (confettiInstanceRef.current) {
        try {
          confettiInstanceRef.current.reset();
        } catch {}
        confettiInstanceRef.current = null;
      }
    };
  }, []);

  // Poll / Check pending celebrations on load
  useEffect(() => {
    async function checkPendingCelebrations() {
      try {
        const res = await fetch('/api/celebrations/pending');
        if (!res.ok) return;

        const data = await res.json();
        if (data.tier && data.tier !== 'NONE' && data.pendingIds?.length > 0) {
          runCelebrationSequence(data);
        }
      } catch (err) {
        console.error('Failed to fetch pending celebrations:', err);
      }
    }

    checkPendingCelebrations();
  }, []);

  const runCelebrationSequence = async (data: {
    tier: CelebrationTier;
    primaryRequest: any;
    uncelebratedCount: number;
    sectionName?: string;
    milestonePercent?: number;
    pendingIds: string[];
  }) => {
    const { tier, primaryRequest, uncelebratedCount, sectionName, milestonePercent, pendingIds } = data;
    const itemTitle = primaryRequest?.itemTitle || 'Sign-off Request';

    // Screen reader announcement
    const announcementText = `${itemTitle} approved. ${milestonePercent || ''}% complete.`;
    setAriaAnnouncement(announcementText);

    const isReduced = prefersReducedMotion || reduceCelebrations;

    // Toast message text
    let toastMessage = `${itemTitle} approved!`;
    if (uncelebratedCount > 1) {
      toastMessage += ` (${uncelebratedCount - 1} more sign-offs approved)`;
    }

    if (isReduced) {
      // Reduced motion fallback: show static badge/toast, NO animation
      setActiveToast({
        title: 'Sign-off Approved',
        message: toastMessage,
        tier,
      });

      // Acknowledge API immediately for reduced motion
      ackCelebrations(pendingIds);

      setTimeout(() => setActiveToast(null), 4000);
      return;
    }

    // Full Animation Mode
    const isMobile = window.innerWidth < 640;
    const particleCount = isMobile ? 35 : 80;

    let fire = confettiInstanceRef.current;
    if (!fire) {
      try {
        const confettiMod = await import('canvas-confetti');
        const defaultFn = confettiMod.default || confettiMod;
        fire = typeof defaultFn === 'function' ? defaultFn : null;
      } catch {}
    }

    if (typeof fire !== 'function') {
      setActiveToast({ title: 'Sign-off Approved', message: toastMessage, tier });
      ackCelebrations(pendingIds);
      setTimeout(() => setActiveToast(null), 3000);
      return;
    }

    if (tier === 'STANDARD') {
      fire({
        particleCount,
        origin: { y: 0.85 },
        spread: 70,
        startVelocity: 45,
      });

      setActiveToast({ title: 'Sign-off Approved', message: toastMessage, tier });
      setTimeout(() => {
        ackCelebrations(pendingIds);
        setActiveToast(null);
      }, 2000);

    } else if (tier === 'SECTION_COMPLETE') {
      fire({
        particleCount: particleCount * 1.2,
        origin: { y: 0.8 },
        spread: 90,
        startVelocity: 50,
      });

      setActiveToast({
        title: `Section Complete: ${sectionName || 'Catalog Section'}`,
        message: `Awesome work! Every unit in ${sectionName || 'this section'} is fully approved.`,
        tier,
      });

      setTimeout(() => {
        ackCelebrations(pendingIds);
        setActiveToast(null);
      }, 3000);

    } else if (tier === 'MILESTONE') {
      // Dual side burst
      fire({
        particleCount: particleCount,
        origin: { x: 0.1, y: 0.7 },
        angle: 60,
        spread: 55,
      });
      fire({
        particleCount: particleCount,
        origin: { x: 0.9, y: 0.7 },
        angle: 120,
        spread: 55,
      });

      setActiveToast({
        title: `Milestone Unlocked! ${milestonePercent}% Complete`,
        message: `You've passed the ${milestonePercent}% course milestone!`,
        tier,
      });

      setTimeout(() => {
        ackCelebrations(pendingIds);
        setActiveToast(null);
      }, 3000);

    } else if (tier === 'COURSE_COMPLETE') {
      // 5s Full-screen celebration
      const end = Date.now() + 5000;

      const frame = () => {
        fire({
          particleCount: isMobile ? 3 : 6,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        fire({
          particleCount: isMobile ? 3 : 6,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        } else {
          ackCelebrations(pendingIds);
        }
      };
      requestAnimationFrame(frame);

      setActiveToast({
        title: '🏆 DIVEMASTER COMPLETE!',
        message: 'Congratulations! All 53 units and requirements are 100% complete!',
        tier,
      });

      setTimeout(() => setActiveToast(null), 6000);
    }
  };

  const ackCelebrations = async (requestIds: string[]) => {
    try {
      await fetch('/api/celebrations/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds }),
      });
    } catch (err) {
      console.error('Failed to acknowledge celebrations:', err);
    }
  };

  const triggerCelebration = (tier: CelebrationTier, title?: string) => {
    runCelebrationSequence({
      tier,
      primaryRequest: { itemTitle: title || 'Requirement' },
      uncelebratedCount: 1,
      pendingIds: [],
    });
  };

  return (
    <CelebrationContext.Provider value={{ reduceCelebrations, setReduceCelebrations, triggerCelebration }}>
      {children}

      {/* Screen Reader ARIA Live Polite Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaAnnouncement}
      </div>

      {/* Fixed Non-Blocking Celebration Canvas (pointer-events: none) */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-[45]"
        style={{ pointerEvents: 'none' }}
      />

      {/* Celebration Notification Toast Banner */}
      {activeToast && (
        <div className="fixed top-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[48] pointer-events-auto animate-in slide-in-from-top-4 duration-300">
          <Card className="bg-slate-900/95 border-sky-500/50 text-white p-4 shadow-2xl rounded-2xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">
                {activeToast.tier === 'COURSE_COMPLETE' ? '🏆' : activeToast.tier === 'MILESTONE' ? '🎯' : '🎉'}
              </span>
              <div className="space-y-1 flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-sky-400">{activeToast.title}</h4>
                  <Badge variant="outline" className="border-sky-400/40 text-sky-300 text-[10px] px-1.5 py-0 font-bold">
                    {activeToast.tier}
                  </Badge>
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">{activeToast.message}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </CelebrationContext.Provider>
  );
}
