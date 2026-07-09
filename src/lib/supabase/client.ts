import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ── Expiration automatique de session après 8h d'inactivité ──
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 heures
const LAST_ACTIVITY_KEY = 'itilib_last_activity';

if (typeof window !== 'undefined') {
  // Mettre à jour le timestamp d'activité sur chaque interaction
  const updateActivity = () => localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt =>
    window.addEventListener(evt, updateActivity, { passive: true })
  );
  updateActivity();

  // Vérifier toutes les minutes si la session a expiré
  setInterval(async () => {
    const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) ?? '0');
    if (Date.now() - last > SESSION_TIMEOUT_MS) {
      await supabase.auth.signOut();
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      window.location.href = '/auth?reason=inactivity';
    }
  }, 60 * 1000);
}

export type SupabaseClient = typeof supabase;
