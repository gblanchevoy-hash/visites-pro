'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';
import Sidebar from './Sidebar';
import SubscriptionBanner from '@/components/ui/SubscriptionBanner';
import { useSubscription } from '@/lib/hooks/useSubscription';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser, loadPatients, loadSettings, setIsOnline } = useAppStore();
  const { sub } = useSubscription();
  const [ready, setReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoutInactivity = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/auth?reason=inactivity');
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleLogoutInactivity, INACTIVITY_TIMEOUT_MS);
  }, [handleLogoutInactivity]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setIsOnline(navigator.onLine);

    // Auth check
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth');
      } else {
        setUser({ id: data.session.user.id, email: data.session.user.email! });
        loadPatients();
        loadSettings();
        setReady(true);
        resetTimer();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.replace('/auth');
      if (session) setUser({ id: session.user.id, email: session.user.email! });
    });

    // Activity listeners for inactivity timeout
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          {/* Road loading animation */}
          <svg width="80" height="40" viewBox="0 0 80 40">
            <rect x="30" y="15" width="20" height="10" rx="2" fill="#1e3a8a" opacity="0.15" />
            <line x1="0" y1="30" x2="80" y2="30" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="30" x2="80" y2="30" stroke="white" strokeWidth="1"
              strokeDasharray="8 8" className="animate-dash" />
            <circle cx="40" cy="20" r="6" fill="#2563eb" className="animate-bounce-subtle" />
            <path d="M36 20 Q40 14 44 20" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-slate-400 font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-[260px] h-screen flex flex-col overflow-hidden bg-slate-50">
        {children}
      </main>
    </div>
  );
}
