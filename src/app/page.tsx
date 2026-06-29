'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
      else router.replace('/auth');
    });
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm">Chargement…</p>
      </div>
    </div>
  );
}
