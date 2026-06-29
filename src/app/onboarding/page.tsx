'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { setSettings, loadSettings } = useAppStore();
  const [pseudonyme, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return; }
      setUserId(data.session.user.id);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudonyme.trim() || !userId) return;
    setLoading(true);

    // Check if settings row exists
    const { data: existing } = await supabase
      .from('user_settings').select('id').eq('user_id', userId).single();

    if (existing?.id) {
      await supabase.from('user_settings')
        .update({ pseudonyme: pseudonyme.trim() })
        .eq('user_id', userId);
    } else {
      await supabase.from('user_settings').insert({
        user_id: userId,
        pseudonyme: pseudonyme.trim(),
        bareme_km: 0.62,
        duree_visite_defaut: 30,
        heure_debut_journee: '08:00',
        heure_fin_journee: '19:00',
        categories: [],
        couleurs_categories: {},
        theme: 'light',
      });
    }

    await loadSettings();
    toast.success(`Bienvenue ${pseudonyme.trim()} !`);
    router.replace('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-4">
            <Image src="/icons/logo.png" alt="VisitePro" width={64} height={64} className="rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Bienvenue sur VisitePro !</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">
            Avant de commencer, choisissez comment vous souhaitez être appelé.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Votre prénom ou pseudonyme</h2>
          <p className="text-sm text-slate-500 mb-6">
            Il apparaîtra sur votre tableau de bord et dans l'application.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <input
                className="input text-lg py-3 text-center font-semibold"
                placeholder="Ex : Sophie, Dr Martin, Infirmière Dupont…"
                value={pseudonyme}
                onChange={e => setPseudo(e.target.value)}
                required
                autoFocus
              />
            </div>

            {pseudonyme.trim() && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center text-sm text-blue-700">
                Votre tableau de bord affichera : <strong>Bonjour {pseudonyme.trim()} !</strong>
              </div>
            )}

            <button type="submit" disabled={loading || !pseudonyme.trim()}
              className="btn-primary w-full justify-center py-3 text-base">
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement…</>
                : <><CheckCircle2 className="w-5 h-5" /> Commencer</>}
            </button>
          </form>

          <button onClick={() => router.replace('/dashboard')}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors">
            Passer cette étape →
          </button>
        </div>
      </div>
    </div>
  );
}
