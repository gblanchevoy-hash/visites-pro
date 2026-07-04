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
    toast.success('Compte créé ! Vérifiez votre email.');
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

  const features = [
    { icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/><path d="M8 11h6M11 8v6"/></svg>
    ), title: 'Itinéraires optimisés', desc: 'Réduisez vos déplacements et gagnez du temps.' },
    { icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13M12 17V9M16 17V13"/></svg>
    ), title: 'Statistiques détaillées', desc: 'Kilomètres, temps et frais suivis en temps réel.' },
    { icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
    ), title: 'Application PWA', desc: 'Disponible sur tablette, mobile et desktop.' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 30%, #f8faff 60%, #eef2ff 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 48px', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.8)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(37,99,235,0.35)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize:'16px', fontWeight:800, color:'#0f172a', letterSpacing:'-0.3px', lineHeight:1 }}>Itilib</p>
            <p style={{ fontSize:'11px', color:'#94a3b8', marginTop:'1px' }}>Visites à domicile</p>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 480px', gap:'0', padding:'40px 48px 40px', maxWidth:'1300px', margin:'0 auto', width:'100%', alignItems:'center' }}>

        {/* Left */}
        <div style={{ paddingRight:'80px' }}>
          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 14px', background:'rgba(255,255,255,0.9)', border:'1px solid #e2e8f0', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#475569', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'24px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            Plateforme professionnelle
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:'52px', fontWeight:900, color:'#0f172a', lineHeight:'1.05', letterSpacing:'-1.5px', marginBottom:'20px' }}>
            Simplifiez vos visites<br />
            <span style={{ color:'#2563eb' }}>à domicile.</span>
          </h1>

          <p style={{ color:'#64748b', fontSize:'17px', lineHeight:'1.65', marginBottom:'40px', maxWidth:'440px' }}>
            Planification, cartographie et kilométrage optimisés<br />
            pour les professionnels de santé.
          </p>

          {/* Route illustration */}
          <div style={{ position:'relative', height:'90px', marginBottom:'40px' }}>
            <svg viewBox="0 0 560 90" style={{ width:'100%', height:'90px' }} fill="none">
              {/* Dashed road */}
              <path d="M30 75 Q120 20 240 45 Q360 70 460 18" stroke="#bfdbfe" strokeWidth="3" strokeDasharray="10 7" strokeLinecap="round"/>
              {/* Start circle */}
              <circle cx="30" cy="75" r="8" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2"/>
              <circle cx="30" cy="75" r="3" fill="#2563eb"/>
              {/* Mid dot */}
              <circle cx="245" cy="47" r="10" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2"/>
              <circle cx="245" cy="47" r="4" fill="#2563eb"/>
              {/* Pin */}
              <path d="M460 3 C454 3 449 8.5 449 15 C449 23 460 33 460 33 C460 33 471 23 471 15 C471 8.5 466 3 460 3Z" fill="#2563eb" opacity="0.9"/>
              <circle cx="460" cy="15" r="5" fill="white"/>
              <ellipse cx="460" cy="34" rx="5" ry="2" fill="#2563eb" opacity="0.2"/>
            </svg>
          </div>

          {/* Feature cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
            {features.map(f => (
              <div key={f.title} style={{
                background:'rgba(255,255,255,0.85)',
                border:'1px solid rgba(255,255,255,0.9)',
                borderRadius:'16px',
                padding:'18px',
                boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
                backdropFilter:'blur(8px)',
                transition:'transform 0.2s, box-shadow 0.2s',
              }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px' }}>
                  {f.icon}
                </div>
                <p style={{ fontSize:'13px', fontWeight:700, color:'#0f172a', marginBottom:'6px' }}>{f.title}</p>
                <p style={{ fontSize:'12px', color:'#94a3b8', lineHeight:'1.5' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form card */}
        <div style={{
          background:'rgba(255,255,255,0.92)',
          borderRadius:'24px',
          padding:'44px',
          boxShadow:'0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)',
          border:'1px solid rgba(255,255,255,0.95)',
          backdropFilter:'blur(20px)',
        }}>
          <h2 style={{ fontSize:'28px', fontWeight:900, color:'#0f172a', letterSpacing:'-0.5px', marginBottom:'4px' }}>
            {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Créer un compte' : 'Réinitialiser'}
          </h2>
          <p style={{ fontSize:'14px', color:'#94a3b8', marginBottom:'28px' }}>
            {mode === 'login' ? 'Accédez à votre espace professionnel'
              : mode === 'register' ? 'Commencez à organiser vos tournées'
              : 'Recevez un lien de réinitialisation'}
          </p>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'7px' }}>Prénom / Pseudonyme</label>
                <div style={{ position:'relative' }}>
                  <User style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', width:'16px', height:'16px', color:'#94a3b8' }} />
                  <input style={{ width:'100%', padding:'13px 14px 13px 42px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:'12px', fontSize:'14px', color:'#0f172a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as 'border-box' }}
                    placeholder="Ex : Sophie, Dr Martin…" value={pseudonyme} onChange={e => setPseudo(e.target.value)} required />
                </div>
              </div>
            )}
            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'7px' }}>Adresse email</label>
              <div style={{ position:'relative' }}>
                <Mail style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', width:'16px', height:'16px', color:'#94a3b8' }} />
                <input type="email" style={{ width:'100%', padding:'13px 14px 13px 42px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:'12px', fontSize:'14px', color:'#0f172a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as 'border-box' }}
                  placeholder="exemple@domaine.fr" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            {mode !== 'reset' && (
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'7px' }}>Mot de passe</label>
                <div style={{ position:'relative' }}>
                  <Lock style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', width:'16px', height:'16px', color:'#94a3b8' }} />
                  <input type={showPwd ? 'text' : 'password'} style={{ width:'100%', padding:'13px 42px 13px 42px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:'12px', fontSize:'14px', color:'#0f172a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as 'border-box' }}
                    placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center' }}>
                    {showPwd ? <EyeOff style={{ width:'16px', height:'16px' }} /> : <Eye style={{ width:'16px', height:'16px' }} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              padding:'14px', background: loading ? '#93c5fd' : '#2563eb', color:'#fff',
              border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow:'0 4px 16px rgba(37,99,235,0.35)',
              transition:'all 0.15s', marginTop:'4px',
              letterSpacing:'-0.2px',
            }}>
              {loading ? 'Chargement…'
                : mode === 'login' ? <><span>Se connecter</span><ArrowRight style={{ width:'16px', height:'16px' }} /></>
                : mode === 'register' ? <><span>Créer mon compte</span><ArrowRight style={{ width:'16px', height:'16px' }} /></>
                : 'Envoyer le lien'}
            </button>
          </form>

          <div style={{ marginTop:'22px', textAlign:'center', display:'flex', flexDirection:'column', gap:'10px' }}>
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('reset')} style={{ background:'none', border:'none', color:'#2563eb', fontSize:'14px', fontWeight:500, cursor:'pointer' }}>
                  Mot de passe oublié ?
                </button>
                <p style={{ color:'#94a3b8', fontSize:'14px' }}>
                  Pas encore de compte ?{' '}
                  <button onClick={() => setMode('register')} style={{ background:'none', border:'none', color:'#2563eb', fontWeight:700, cursor:'pointer', fontSize:'14px' }}>S'inscrire</button>
                </p>
              </>
            )}
            {mode !== 'login' && (
              <button onClick={() => setMode('login')} style={{ background:'none', border:'none', color:'#64748b', fontSize:'13px', cursor:'pointer' }}>
                ← Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 48px', borderTop:'1px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.5)', backdropFilter:'blur(8px)' }}>
        <p style={{ fontSize:'12px', color:'#94a3b8' }}>© 2026 Itilib. Tous droits réservés.</p>
        <div style={{ display:'flex', gap:'24px' }}>
          <a href="/mentions-legales" style={{ fontSize:'12px', color:'#94a3b8', textDecoration:'none' }}>Mentions légales</a>
          <a href="/mentions-legales" style={{ fontSize:'12px', color:'#94a3b8', textDecoration:'none' }}>Confidentialité</a>
        </div>
      </footer>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense fallback={null}><AuthInner /></Suspense>;
}
