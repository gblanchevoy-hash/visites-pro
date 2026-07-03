'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, Mail, Lock, User } from 'lucide-react';

function AuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [pseudonyme, setPseudo] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (params.get('reason') === 'inactivity')
      toast('Déconnecté pour inactivité (30 min)', { icon: '🔒' });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.user) {
      const { data: s } = await supabase.from('user_settings').select('pseudonyme').eq('user_id', data.user.id).single();
      router.replace(s?.pseudonyme ? '/dashboard' : '/onboarding');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    if (!pseudonyme.trim()) { toast.error('Choisissez un pseudonyme'); setLoading(false); return; }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('user_settings').insert({
        user_id: data.user.id, pseudonyme: pseudonyme.trim(),
        bareme_km: 0.62, duree_visite_defaut: 30,
        heure_debut_journee: '08:00', heure_fin_journee: '19:00',
        categories: [], couleurs_categories: {}, theme: 'light',
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">

      {/* Top bar */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#0f172a] text-[15px] leading-none">Itilib</p>
            <p className="text-[#94a3b8] text-[11px] mt-0.5">Visites à domicile</p>
          </div>
        </div>
      </nav>

      {/* Main grid */}
      <div className="flex-1 grid lg:grid-cols-2 gap-0 px-6 lg:px-16 pb-10 pt-4 max-w-7xl mx-auto w-full">

        {/* ── Left ── */}
        <div className="flex flex-col justify-center pr-0 lg:pr-16 mb-10 lg:mb-0">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-full text-[11px] font-semibold text-[#475569] tracking-widest uppercase w-fit mb-7 shadow-sm">
            Plateforme professionnelle
          </div>

          {/* Headline */}
          <h1 className="text-[42px] lg:text-[52px] font-black text-[#0f172a] leading-[1.1] mb-5">
            Itilib, l'outil indispensable<br />
            <span className="text-[#2563eb]">des pros itinérants.</span>
          </h1>
          <p className="text-[#64748b] text-[16px] leading-relaxed mb-10 max-w-md">
            Planification, cartographie, kilométrage et rapport fiscal —<br />
            tout ce dont vous avez besoin, en un seul endroit.
          </p>

          {/* Route illustration */}
          <div className="relative h-28 mb-10 hidden lg:block">
            <svg viewBox="0 0 500 100" className="w-full h-full" fill="none">
              {/* Road */}
              <path d="M50 80 Q150 20 300 50 Q400 70 460 15" stroke="#dbeafe" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round"/>
              {/* Start dot */}
              <circle cx="50" cy="80" r="7" fill="#2563eb" opacity="0.4"/>
              {/* Pin */}
              <ellipse cx="460" cy="15" rx="5" ry="3" fill="#93c5fd" opacity="0.5"/>
              <path d="M460 2 C455 2 451 6 451 11 C451 17 460 24 460 24 C460 24 469 17 469 11 C469 6 465 2 460 2Z" fill="#2563eb"/>
              <circle cx="460" cy="11" r="3" fill="white"/>
            </svg>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🗺️', title: 'Itinéraires optimisés', desc: 'Moins de km, plus de temps : tournées calculées automatiquement.' },
              { icon: '📋', title: 'Rapport fiscal intégré', desc: 'Indemnités kilométriques prêtes pour votre comptable en 1 clic.' },
              { icon: '📱', title: 'Multi-device & offline', desc: 'Tablette, mobile, desktop — fonctionne même sans connexion.' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-xl bg-[#eff6ff] flex items-center justify-center text-lg mb-3">{f.icon}</div>
                <p className="font-bold text-[#0f172a] text-[12px] mb-1">{f.title}</p>
                <p className="text-[#94a3b8] text-[11px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — Form card ── */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] border border-[#f1f5f9] p-8 lg:p-10">

            <h2 className="text-[28px] font-black text-[#0f172a] mb-1">
              {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Créer un compte' : 'Mot de passe oublié'}
            </h2>
            <p className="text-[#94a3b8] text-sm mb-7">
              {mode === 'login' ? 'Accédez à votre espace professionnel'
                : mode === 'register' ? 'Commencez à organiser vos tournées'
                : 'Recevez un lien de réinitialisation par email'}
            </p>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Prénom / Pseudonyme</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input className="w-full pl-11 pr-4 py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[14px] text-[#0f172a] placeholder-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                      placeholder="Ex : Sophie, Dr Martin…" value={pseudonyme} onChange={e => setPseudo(e.target.value)} required />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                  <input type="email" className="w-full pl-11 pr-4 py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[14px] text-[#0f172a] placeholder-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                    placeholder="exemple@domaine.fr" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input type={showPwd ? 'text' : 'password'} className="w-full pl-11 pr-11 py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[14px] text-[#0f172a] placeholder-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                      placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] transition-colors">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-[15px] rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] mt-2 disabled:opacity-60">
                {loading ? 'Chargement…'
                  : mode === 'login' ? <><span>Se connecter</span><ArrowRight className="w-4 h-4" /></>
                  : mode === 'register' ? <><span>Créer mon compte</span><ArrowRight className="w-4 h-4" /></>
                  : 'Envoyer le lien'}
              </button>
            </form>

            <div className="mt-6 space-y-3 text-center">
              {mode === 'login' && (
                <>
                  <button onClick={() => setMode('reset')} className="text-[#2563eb] text-[13px] hover:underline block w-full font-medium">
                    Mot de passe oublié ?
                  </button>
                  <p className="text-[#94a3b8] text-[13px]">
                    Pas encore de compte ?{' '}
                    <button onClick={() => setMode('register')} className="text-[#2563eb] font-bold hover:underline">S'inscrire</button>
                  </p>
                </>
              )}
              {mode !== 'login' && (
                <button onClick={() => setMode('login')} className="text-[#64748b] text-[13px] hover:text-[#0f172a] transition-colors">
                  ← Retour à la connexion
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-8 py-4 border-t border-[#e2e8f0]">
        <p className="text-[#94a3b8] text-[12px]">© 2026 Itilib. Tous droits réservés.</p>
        <div className="flex gap-5">
          <button className="text-[#94a3b8] text-[12px] hover:text-[#475569] transition-colors">Mentions légales</button>
          <button className="text-[#94a3b8] text-[12px] hover:text-[#475569] transition-colors">Confidentialité</button>
        </div>
      </footer>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense fallback={null}><AuthInner /></Suspense>;
}
