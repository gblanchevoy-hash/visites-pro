'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

function AuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [pseudonyme, setPseudo] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    if (params.get('reason') === 'inactivity')
      toast('Déconnecté pour inactivité', { icon: '🔒' });
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
    setMode('login'); setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message);
    else toast.success('Email envoyé !');
    setLoading(false);
  };

  const submit = mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body { height: 100%; overflow: hidden; }

        .auth-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          width: 100vw; height: 100vh; overflow: hidden;
          background: #FCFCFD;
          position: relative;
          display: flex; flex-direction: column;
        }

        /* ── Background layers ── */
        .bg-halo-main {
          position: absolute; pointer-events: none;
          width: 1000px; height: 800px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, #DBEAFE 0%, transparent 70%);
          opacity: 0.08;
          filter: blur(150px);
          top: 50%; left: 55%; transform: translate(-40%, -50%);
          z-index: 0;
        }
        .bg-halo-top {
          position: absolute; pointer-events: none;
          width: 600px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, #BFDBFE 0%, transparent 70%);
          opacity: 0.04;
          filter: blur(120px);
          top: -100px; right: 100px;
          z-index: 0;
        }
        .bg-halo-bottom {
          position: absolute; pointer-events: none;
          width: 700px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, #E0E7FF 0%, transparent 70%);
          opacity: 0.05;
          filter: blur(140px);
          bottom: -80px; left: 0;
          z-index: 0;
        }

        /* ── Road SVG ── */
        .bg-road {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
        }

        /* ── Logo ── */
        .logo {
          position: absolute;
          top: 48px; left: 56px;
          display: flex; align-items: center; gap: 12px;
          z-index: 10;
          opacity: 0; animation: fadeUp 500ms ease forwards;
        }
        .logo-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: #2563EB;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(37,99,235,.30);
          flex-shrink: 0;
        }
        .logo-name { font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.3px; line-height: 1; }
        .logo-sub  { font-size: 12px; color: #94A3B8; margin-top: 2px; }

        /* ── Main grid ── */
        .main-grid {
          flex: 1; display: grid;
          grid-template-columns: 58fr 42fr;
          padding: 0 80px 0 64px;
          align-items: center;
          gap: 0;
          position: relative; z-index: 1;
          max-width: 1500px; width: 100%; margin: 0 auto;
        }

        /* ── Left column ── */
        .col-left {
          padding-right: 80px;
          display: flex; flex-direction: column;
        }

        .badge {
          display: inline-flex; align-items: center;
          height: 40px; padding: 0 20px;
          border-radius: 999px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          font-size: 14px; font-weight: 600;
          letter-spacing: 0.08em;
          color: #2563EB;
          text-transform: uppercase;
          width: fit-content;
          margin-bottom: 32px;
          opacity: 0; animation: fadeUp 500ms ease 80ms forwards;
        }

        .headline {
          max-width: 620px;
          font-size: 68px; font-weight: 900;
          line-height: 74px;
          letter-spacing: -2px;
          margin-bottom: 24px;
          opacity: 0; animation: fadeUp 500ms ease 120ms forwards;
        }
        .headline-line1 { color: #0F172A; display: block; }
        .headline-line2 { color: #2563EB; display: block; }

        .description {
          max-width: 560px;
          font-size: 19px; font-weight: 400;
          line-height: 1.6; color: #64748B;
          margin-bottom: 48px;
          opacity: 0; animation: fadeUp 500ms ease 160ms forwards;
        }

        /* ── Feature cards ── */
        .cards-row {
          display: flex; gap: 20px;
        }

        .feat-card {
          width: 220px; height: 200px;
          border-radius: 28px;
          background: #FFFFFF;
          border: 1px solid #F1F5F9;
          box-shadow: 0 24px 60px rgba(15,23,42,.05);
          padding: 28px 24px;
          display: flex; flex-direction: column;
          cursor: default;
          transition: transform 250ms ease, box-shadow 250ms ease;
          opacity: 0;
        }
        .feat-card:nth-child(1) { animation: fadeUp 500ms ease 200ms forwards; }
        .feat-card:nth-child(2) { animation: fadeUp 500ms ease 280ms forwards; }
        .feat-card:nth-child(3) { animation: fadeUp 500ms ease 360ms forwards; }
        .feat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 32px 80px rgba(15,23,42,.10);
        }
        .feat-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: #EFF6FF;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px; flex-shrink: 0;
        }
        .feat-title { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 8px; line-height: 1.3; }
        .feat-desc  { font-size: 13px; font-weight: 400; color: #64748B; line-height: 1.5; }

        /* ── Login card ── */
        .col-right {
          display: flex; align-items: center; justify-content: center;
        }

        .login-card {
          width: 480px;
          border-radius: 36px;
          background: #FFFFFF;
          border: 1px solid rgba(255,255,255,.65);
          box-shadow: 0 40px 90px rgba(15,23,42,.10);
          padding: 48px;
          opacity: 0; animation: fadeUp 500ms ease 120ms forwards;
        }

        .form-title { font-size: 40px; font-weight: 900; color: #0F172A; letter-spacing: -1px; margin-bottom: 6px; }
        .form-sub   { font-size: 17px; font-weight: 400; color: #94A3B8; margin-bottom: 36px; }

        .field { margin-bottom: 16px; }
        .field-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute; left: 20px; top: 50%; transform: translateY(-50%);
          width: 20px; height: 20px; color: #94A3B8; pointer-events: none;
        }
        .field-input {
          width: 100%; height: 64px;
          border-radius: 16px;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          padding: 0 20px 0 52px;
          font-size: 16px; font-family: inherit; color: #0F172A;
          outline: none; transition: border-color 200ms, box-shadow 200ms;
        }
        .field-input::placeholder { color: #94A3B8; }
        .field-input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,.10);
        }
        .field-eye {
          position: absolute; right: 18px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #94A3B8; display: flex; align-items: center;
          transition: color 150ms;
        }
        .field-eye:hover { color: #475569; }

        .btn-submit {
          width: 100%; height: 64px;
          border-radius: 16px;
          background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
          border: none; color: #FFFFFF;
          font-size: 17px; font-weight: 700; font-family: inherit;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 8px 24px rgba(37,99,235,.30);
          transition: transform 250ms ease, box-shadow 250ms ease, opacity 250ms;
          margin-top: 8px;
          letter-spacing: -0.2px;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(37,99,235,.40);
          opacity: 0.95;
        }
        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        .form-links { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; text-align: center; }
        .link-btn {
          background: none; border: none; font-family: inherit;
          font-size: 15px; font-weight: 500; color: #2563EB; cursor: pointer;
          transition: opacity 150ms;
        }
        .link-btn:hover { opacity: 0.75; }
        .link-secondary { font-size: 15px; color: #94A3B8; }
        .link-secondary .link-btn { font-size: 15px; }

        /* ── Footer ── */
        .footer {
          position: relative; z-index: 10;
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 64px 24px;
        }
        .footer p, .footer a { font-size: 14px; color: #94A3B8; text-decoration: none; }
        .footer-links { display: flex; gap: 28px; }
        .footer a:hover { color: #64748B; }

        /* ── Animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 1199px) {
          .headline { font-size: 52px; line-height: 58px; }
          .description { font-size: 17px; }
          .main-grid { padding: 0 48px; }
          .col-left { padding-right: 48px; }
        }
        @media (max-width: 1023px) {
          html, body { overflow: auto; }
          .auth-page { height: auto; min-height: 100vh; overflow: auto; }
          .main-grid {
            grid-template-columns: 1fr;
            padding: 80px 32px 32px;
            gap: 48px;
          }
          .col-left { padding-right: 0; }
          .col-right { justify-content: flex-start; }
          .login-card { width: 100%; max-width: 480px; }
          .cards-row { flex-wrap: wrap; }
          .feat-card { flex: 1; min-width: 200px; height: auto; }
          .headline { font-size: 40px; line-height: 46px; }
        }
      `}</style>

      <div className="auth-page">
        {/* Background layers */}
        <div className="bg-halo-main" />
        <div className="bg-halo-top" />
        <div className="bg-halo-bottom" />

        {/* Road illustration */}
        <svg className="bg-road" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice">
          <path
            d="M-100 700 Q200 500 400 450 Q600 400 700 320 Q820 230 1000 200 Q1150 175 1300 120 Q1400 95 1540 80"
            stroke="#BFDBFE" strokeWidth="2" strokeDasharray="12 10" strokeLinecap="round"
            opacity="0.30"
          />
          {/* GPS markers */}
          {[{x:400, y:452}, {x:700, y:322}, {x:1000, y:202}].map((pt, i) => (
            <g key={i} opacity="0.13">
              <ellipse cx={pt.x} cy={pt.y + 18} rx="8" ry="3" fill="#93C5FD" />
              <path d={`M${pt.x} ${pt.y-16} C${pt.x-10} ${pt.y-16} ${pt.x-14} ${pt.y-6} ${pt.x-14} ${pt.y} C${pt.x-14} ${pt.y+8} ${pt.x} ${pt.y+18} ${pt.x} ${pt.y+18} C${pt.x} ${pt.y+18} ${pt.x+14} ${pt.y+8} ${pt.x+14} ${pt.y} C${pt.x+14} ${pt.y-6} ${pt.x+10} ${pt.y-16} ${pt.x} ${pt.y-16}Z`}
                fill="#2563EB" />
              <circle cx={pt.x} cy={pt.y} r="4" fill="white" />
            </g>
          ))}
        </svg>

        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="logo-name">Itilib</div>
            <div className="logo-sub">Visites à domicile</div>
          </div>
        </div>

        {/* Main grid */}
        <div className="main-grid">

          {/* ── Left column ── */}
          <div className="col-left">
            <div className="badge">Plateforme professionnelle</div>

            <h1 className="headline">
              <span className="headline-line1">Simplifiez vos visites</span>
              <span className="headline-line2">à domicile.</span>
            </h1>

            <p className="description">
              Planification, cartographie et kilométrage optimisés<br />
              pour les professionnels de santé.
            </p>

            <div className="cards-row">
              {[
                {
                  icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M12 8v3l2 2M21 21l-4.35-4.35"/></svg>,
                  title: 'Itinéraires optimisés',
                  desc: 'Réduisez vos déplacements et gagnez du temps.',
                },
                {
                  icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13M12 17V9M16 17V13"/></svg>,
                  title: 'Statistiques détaillées',
                  desc: 'Kilomètres, temps et frais suivis en temps réel.',
                },
                {
                  icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>,
                  title: 'Application PWA',
                  desc: 'Disponible sur tablette, mobile et desktop.',
                },
              ].map(f => (
                <div className="feat-card" key={f.title}>
                  <div className="feat-icon">{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column — Login card ── */}
          <div className="col-right">
            <div className="login-card">
              <div className="form-title">
                {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Créer un compte' : 'Réinitialiser'}
              </div>
              <div className="form-sub">
                {mode === 'login' ? 'Accédez à votre espace professionnel'
                  : mode === 'register' ? 'Commencez à organiser vos tournées'
                  : 'Recevez un lien de réinitialisation par email'}
              </div>

              <form onSubmit={submit}>
                {mode === 'register' && (
                  <div className="field">
                    <label className="field-label">Prénom / Pseudonyme</label>
                    <div className="field-wrap">
                      <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <input className="field-input" placeholder="Ex : Sophie, Dr Martin…" value={pseudonyme} onChange={e => setPseudo(e.target.value)} required />
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="field-label">Adresse email</label>
                  <div className="field-wrap">
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <input type="email" className="field-input" placeholder="exemple@domaine.fr" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div className="field">
                    <label className="field-label">Mot de passe</label>
                    <div className="field-wrap">
                      <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <input type={showPwd ? 'text' : 'password'} className="field-input" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                      <button type="button" className="field-eye" onClick={() => setShowPwd(!showPwd)}>
                        {showPwd
                          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                      </button>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Chargement…'
                    : mode === 'login' ? <>Se connecter <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                    : mode === 'register' ? <>Créer mon compte <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                    : 'Envoyer le lien'}
                </button>
              </form>

              <div className="form-links">
                {mode === 'login' && (
                  <>
                    <button className="link-btn" onClick={() => setMode('reset')}>Mot de passe oublié ?</button>
                    <p className="link-secondary">Pas encore de compte ? <button className="link-btn" onClick={() => setMode('register')}>S'inscrire</button></p>
                  </>
                )}
                {mode !== 'login' && (
                  <button className="link-btn" onClick={() => setMode('login')} style={{ color: '#64748B' }}>← Retour à la connexion</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p>© 2026 Itilib. Tous droits réservés.</p>
          <div className="footer-links">
            <a href="/mentions-legales">Mentions légales</a>
            <a href="/mentions-legales">Confidentialité</a>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function AuthPage() {
  return <Suspense fallback={null}><AuthInner /></Suspense>;
}
