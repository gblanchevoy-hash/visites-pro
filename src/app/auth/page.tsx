'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import toast from 'react-hot-toast';

function AuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  useEffect(() => {
    if (params.get('reason') === 'inactivity') {
      toast('Déconnecté pour inactivité (30 min)', { icon: '🔒' });
    }
  }, []);

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [pseudonyme, setPseudo]   = useState('');
  const [loading, setLoading]     = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    // Check if user has a pseudonyme set
    if (data.user) {
      const { data: settingsData } = await supabase
        .from('user_settings').select('pseudonyme').eq('user_id', data.user.id).single();
      if (!settingsData?.pseudonyme) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    if (!pseudonyme.trim()) { toast.error('Choisissez un pseudonyme'); setLoading(false); return; }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    // Save pseudonyme in user_settings
    if (data.user) {
      await supabase.from('user_settings').insert({
        user_id: data.user.id,
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
    toast.success('Compte créé ! Connectez-vous.');
    setMode('login');
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message);
    else toast.success('Email de réinitialisation envoyé !');
    setLoading(false);
  };

  const submit = mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-primary-950 to-indigo-900">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Background car illustration */}
        <img src="/icons/mets_la_gomme_white.png" alt="" aria-hidden="true"
          className="absolute bottom-0 right-0 w-full pointer-events-none"
          style={{ opacity: 0.12, filter: 'brightness(10)', maxWidth: '600px' }} />

        <div className="flex items-center gap-4 relative">
          <Image src="/icons/logo.png" alt="Mets la gomme !" width={56} height={56} className="rounded-2xl bg-white p-1 shadow-lg" />
          <span className="text-2xl font-bold tracking-tight">Mets la gomme !</span>
        </div>

        <div className="relative">
          {/* Large illustration above title */}
          <img src="/icons/mets_la_gomme_white.png" alt="" aria-hidden="true"
            className="w-3/4 mb-6 pointer-events-none"
            style={{ opacity: 0.9, filter: 'brightness(10)' }} />

          <h1 className="text-6xl font-black leading-tight mb-4 tracking-tight">
            Mets la<br />
            <span className="text-primary-400">gomme !</span>
          </h1>
          <p className="text-slate-300 text-lg mb-8">
            Planification, cartographie et kilométrage<br />pour les professionnels des visites à domicile.
          </p>
          <div className="space-y-3">
            {[
              { icon: '🗺️', title: 'Itinéraires optimisés', desc: "Réduisez vos déplacements" },
              { icon: '📊', title: 'Statistiques détaillées', desc: 'km, temps, frais en temps réel' },
              { icon: '📱', title: 'Application PWA', desc: 'Tablette, mobile, desktop' },
            ].map(f => (
              <div key={f.title} className="flex gap-3 items-center">
                <span className="text-xl">{f.icon}</span>
                <div><span className="font-semibold">{f.title}</span> — <span className="text-slate-400 text-sm">{f.desc}</span></div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-sm relative">© 2026 Mets la gomme ! Tous droits réservés.</p>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Mobile logo + title */}
            <div className="flex flex-col items-center gap-3 mb-8 lg:hidden">
              <Image src="/icons/mets_la_gomme_white.png" alt="Mets la gomme !" width={180} height={120}
                className="w-48 h-auto" style={{ filter: 'invert(29%) sepia(89%) saturate(1600%) hue-rotate(210deg)' }} />
              <span className="font-black text-2xl text-slate-900 tracking-tight">Mets la gomme !</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Créer un compte' : 'Réinitialiser'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {mode === 'login' ? 'Accédez à votre espace professionnel'
                : mode === 'register' ? 'Commencez à organiser vos tournées'
                : 'Recevez un lien de réinitialisation par email'}
            </p>

            <form onSubmit={submit} className="space-y-4">
              {/* Pseudonyme — inscription uniquement */}
              {mode === 'register' && (
                <div>
                  <label className="label">Votre prénom ou pseudonyme</label>
                  <input className="input" placeholder="Ex : Sophie, Dr Martin…"
                    value={pseudonyme} onChange={e => setPseudo(e.target.value)} required />
                  <p className="text-xs text-slate-400 mt-1">Affiché sur votre tableau de bord</p>
                </div>
              )}
              <div>
                <label className="label">Adresse email</label>
                <input type="email" className="input" placeholder="exemple@domaine.fr"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="label">Mot de passe</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
              )}
              <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                {loading ? 'Chargement…'
                  : mode === 'login' ? 'Se connecter'
                  : mode === 'register' ? 'Créer mon compte'
                  : 'Envoyer'}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-center text-sm">
              {mode === 'login' && (
                <>
                  <button onClick={() => setMode('reset')} className="text-primary-600 hover:underline block w-full">Mot de passe oublié ?</button>
                  <button onClick={() => setMode('register')} className="text-slate-500 hover:text-slate-700">
                    Pas encore de compte ? <span className="text-primary-600 font-medium">S'inscrire</span>
                  </button>
                </>
              )}
              {mode !== 'login' && (
                <button onClick={() => setMode('login')} className="text-slate-500 hover:text-slate-700">← Retour à la connexion</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function AuthPage() {
  return <Suspense fallback={null}><AuthInner /></Suspense>;
}
