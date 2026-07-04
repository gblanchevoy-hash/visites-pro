'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

function AuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [pseudonyme, setPseudo] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        /* ════════════════════════════════════════
           COUCHE 0 — FOND MULTI-RADIAL
        ════════════════════════════════════════ */
        .auth-root {
          font-family: 'Inter', -apple-system, sans-serif;
          width: 100vw; height: 100vh; overflow: hidden;
          position: relative;
          background:
            radial-gradient(circle at 65% 50%, rgba(219,234,254,.55), transparent 40%),
            radial-gradient(circle at 15% 20%, rgba(96,165,250,.05), transparent 35%),
            linear-gradient(180deg, #FFFFFF, #FCFCFD);
        }

        /* ════════════════════════════════════════
           COUCHE 1 — CARTE VECTORIELLE SUGGÉRÉE
           Très discrète, jamais lisible
        ════════════════════════════════════════ */
        .layer-map {
          position: absolute;
          left: 30%; top: 8%;
          width: 45%; height: 84%;
          z-index: 1;
          opacity: 0.06;
          filter: blur(3px);
          pointer-events: none;
        }

        /* ════════════════════════════════════════
           COUCHE 2 — SVG ITINÉRAIRE
           Chemin organique avec courbes S
        ════════════════════════════════════════ */
        .layer-route {
          position: absolute;
          left: 28%; top: 5%;
          width: 50%; height: 90%;
          z-index: 6;
          pointer-events: none;
          filter: drop-shadow(0 0 16px rgba(96,165,250,.40));
        }

        /* ════════════════════════════════════════
           COUCHE 3 — HALOS LUMINEUX
           Derrière la carte de connexion
        ════════════════════════════════════════ */
        .halo-main {
          position: absolute;
          right: -80px; top: 50%;
          transform: translateY(-50%);
          width: 1000px; height: 1000px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(59,130,246,.38) 0%,
            rgba(96,165,250,.24) 25%,
            rgba(147,197,253,.12) 50%,
            rgba(255,255,255,0) 72%
          );
          filter: blur(70px);
          opacity: 1;
          z-index: 3;
          pointer-events: none;
        }
        .halo-mid {
          position: absolute;
          right: 60px; top: 42%;
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,.28), transparent 68%);
          filter: blur(100px);
          z-index: 3;
          pointer-events: none;
        }
        .halo-soft {
          position: absolute;
          right: -40px; top: 15%;
          width: 900px; height: 800px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(191,219,254,.55), transparent 65%);
          filter: blur(140px);
          z-index: 3;
          pointer-events: none;
        }

        /* ════════════════════════════════════════
           COUCHE 4 — MARQUEURS GPS
           3 couches par marqueur : icône + anneau + halo
        ════════════════════════════════════════ */
        .gps-marker {
          position: absolute;
          z-index: 7;
          pointer-events: none;
          display: flex; align-items: center; justify-content: center;
          transform: translate(-50%, -50%);
        }
        .gps-halo {
          position: absolute;
          width: 64px; height: 64px;
          border-radius: 50%;
          background: rgba(91,142,255,.18);
          filter: blur(16px);
        }
        .gps-ring {
          position: absolute;
          width: 48px; height: 48px;
          border-radius: 50%;
          border: 2px solid rgba(91,142,255,.45);
          box-shadow: 0 0 20px rgba(91,142,255,.25);
        }
        .gps-pin {
          position: relative;
          width: 36px; height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: #5B8EFF;
          box-shadow: 0 4px 18px rgba(91,142,255,.40);
          display: flex; align-items: center; justify-content: center;
        }
        .gps-pin::after {
          content: '';
          position: absolute;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: white;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
        }

        /* ════════════════════════════════════════
           COUCHE 5 — LAYOUT & CONTENU
        ════════════════════════════════════════ */
        .layout {
          position: relative; z-index: 10;
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
        }

        /* Logo */
        .logo {
          position: absolute;
          top: 48px; left: 56px;
          display: flex; align-items: center; gap: 12px;
          animation: fadeUp 500ms ease both;
        }
        .logo-mark {
          width: 40px; height: 40px; border-radius: 12px;
          background: #2563EB;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(37,99,235,.30);
          flex-shrink: 0;
        }
        .logo-text-name { font-size: 17px; font-weight: 800; color: #0F172A; letter-spacing: -0.3px; line-height: 1; }
        .logo-text-sub  { font-size: 11px; color: #94A3B8; margin-top: 2px; }

        /* Grid */
        .grid {
          flex: 1;
          display: grid;
          grid-template-columns: 58% 42%;
          padding: 80px 72px 40px 64px;
          align-items: center;
          gap: 0;
        }

        /* Left */
        .col-left { padding-right: 72px; display: flex; flex-direction: column; gap: 0; }

        .badge {
          display: inline-flex; align-items: center;
          height: 40px; padding: 0 20px;
          border-radius: 999px;
          background: #EFF6FF;
          border: 1px solid rgba(191,219,254,.8);
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.08em; color: #2563EB;
          text-transform: uppercase;
          width: fit-content;
          margin-bottom: 28px;
          animation: fadeUp 500ms 80ms ease both;
        }

        .headline {
          font-size: 66px; font-weight: 900;
          line-height: 72px; letter-spacing: -2.5px;
          margin-bottom: 22px;
          animation: fadeUp 500ms 120ms ease both;
        }
        .headline-l1 { display: block; color: #0F172A; }
        .headline-l2 { display: block; color: #2563EB; }

        .desc {
          font-size: 18px; font-weight: 400;
          line-height: 1.6; color: #64748B;
          max-width: 520px;
          margin-bottom: 44px;
          animation: fadeUp 500ms 160ms ease both;
        }

        /* Feature cards */
        .cards { display: flex; gap: 20px; }
        .card {
          flex: 1;
          border-radius: 28px;
          background: #FFFFFF;
          border: 1px solid #F1F5F9;
          box-shadow: 0 30px 90px rgba(15,23,42,.06);
          padding: 26px 22px;
          display: flex; flex-direction: column;
          cursor: default;
          transition: transform 250ms ease, box-shadow 250ms ease;
        }
        .card:nth-child(1) { animation: fadeUp 500ms 200ms ease both; }
        .card:nth-child(2) { animation: fadeUp 500ms 280ms ease both; }
        .card:nth-child(3) { animation: fadeUp 500ms 360ms ease both; }
        .card:hover { transform: translateY(-6px); box-shadow: 0 40px 100px rgba(15,23,42,.10); }
        .card-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: #EFF6FF;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px; flex-shrink: 0;
        }
        .card-title { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 7px; line-height: 1.3; }
        .card-desc  { font-size: 13px; color: #64748B; line-height: 1.5; }

        /* Right */
        .col-right { display: flex; align-items: center; justify-content: center; }

        /* ════════════════════════════════════════
           COUCHE 6 — FORMULAIRE
           La carte flotte grâce aux ombres
        ════════════════════════════════════════ */
        .form-card {
          width: 460px;
          border-radius: 36px;
          background: #FFFFFF;
          border: 1px solid rgba(255,255,255,.65);
          box-shadow: 0 45px 120px rgba(15,23,42,.10), 0 8px 32px rgba(15,23,42,.04);
          padding: 44px 40px;
          animation: fadeUp 500ms 120ms ease both;
        }

        .form-h1  { font-size: 38px; font-weight: 900; color: #0F172A; letter-spacing: -1px; margin-bottom: 5px; }
        .form-sub { font-size: 16px; color: #94A3B8; margin-bottom: 32px; }

        .field       { margin-bottom: 14px; }
        .field-label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 7px; }
        .field-wrap  { position: relative; }
        .field-icon  {
          position: absolute; left: 18px; top: 50%;
          transform: translateY(-50%);
          color: #94A3B8; pointer-events: none;
          display: flex; align-items: center;
        }
        .field-input {
          width: 100%; height: 62px;
          border-radius: 16px;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          padding: 0 18px 0 50px;
          font-size: 15px; font-family: inherit; color: #0F172A;
          outline: none;
          transition: border-color 200ms, box-shadow 200ms;
        }
        .field-input::placeholder { color: #94A3B8; }
        .field-input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,.10);
          background: #FFFFFF;
        }
        .field-eye {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #94A3B8; display: flex; align-items: center;
          transition: color 150ms;
        }
        .field-eye:hover { color: #475569; }

        .btn-primary {
          width: 100%; height: 62px;
          border-radius: 16px;
          background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
          border: none; color: #FFFFFF;
          font-size: 16px; font-weight: 700; font-family: inherit;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 8px 28px rgba(37,99,235,.32);
          transition: transform 250ms ease, box-shadow 250ms ease, opacity 250ms;
          margin-top: 6px; letter-spacing: -0.2px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(37,99,235,.42);
          opacity: .97;
        }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }

        .form-links { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; text-align: center; }
        .lnk {
          background: none; border: none; font-family: inherit;
          font-size: 14px; font-weight: 500; color: #2563EB;
          cursor: pointer; transition: opacity 150ms;
        }
        .lnk:hover { opacity: .72; }
        .lnk-muted { font-size: 14px; color: #94A3B8; }
        .lnk-muted .lnk { font-size: 14px; }

        /* Footer */
        .footer {
          position: relative; z-index: 10;
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 64px 22px;
        }
        .footer span, .footer a { font-size: 14px; color: #94A3B8; text-decoration: none; }
        .footer-links { display: flex; gap: 28px; }
        .footer a:hover { color: #64748B; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1199px) {
          .headline { font-size: 50px; line-height: 56px; }
          .grid { padding: 80px 48px 40px; }
          .col-left { padding-right: 48px; }
          .form-card { width: 420px; padding: 36px 32px; }
        }
        @media (max-width: 1023px) {
          html, body { overflow: auto; }
          .auth-root { height: auto; min-height: 100vh; }
          .grid { grid-template-columns: 1fr; padding: 80px 32px 32px; gap: 40px; }
          .col-left { padding-right: 0; }
          .form-card { width: 100%; max-width: 460px; }
          .cards { flex-wrap: wrap; }
          .card { min-width: 180px; }
          .halo-main, .halo-mid, .halo-soft { display: none; }
        }
      `}</style>

      {/* ════ COUCHE 0 — ROOT ════ */}
      <div className="auth-root">

        {/* ════ COUCHE 1 — CARTE VECTORIELLE SUGGÉRÉE ════ */}
        {/* Couche 1 — Formes abstraites très douces, pas de grille */}
        <svg className="layer-map" viewBox="0 0 400 700" fill="none">
          <ellipse cx="200" cy="200" rx="160" ry="120" fill="#CBD5E1" opacity="0.3"/>
          <ellipse cx="280" cy="420" rx="100" ry="80" fill="#CBD5E1" opacity="0.2"/>
          <ellipse cx="120" cy="560" rx="130" ry="90" fill="#CBD5E1" opacity="0.2"/>
          <circle cx="300" cy="150" r="50" fill="#CBD5E1" opacity="0.15"/>
          <circle cx="80" cy="350" r="70" fill="#CBD5E1" opacity="0.12"/>
        </svg>

        {/* ════ COUCHE 2 — SVG ITINÉRAIRE ════ */}
        <svg className="layer-route" viewBox="0 0 500 800" fill="none" preserveAspectRatio="none">
          <path
            d="M20 40 C160 10 250 90 340 120 S520 240 480 360 S280 520 420 640 S760 760 720 880"
            stroke="#60A5FA"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="10 7"
            opacity=".65"
          />
        </svg>

        {/* ════ COUCHE 3 — HALOS LUMINEUX ════ */}
        <div className="halo-main" />
        <div className="halo-mid"  />
        <div className="halo-soft" />

        {/* ════ COUCHE 4 — MARQUEURS GPS ════ */}
        {/* Marqueurs GPS sur le tracé Bézier — positions mathématiques exactes */}
        <div className="gps-marker" style={{ left:'43.1%', top:'9.7%' }}>
          <div className="gps-halo" />
          <div className="gps-ring" />
          <div className="gps-pin" />
        </div>
        <div className="gps-marker" style={{ left:'73.9%', top:'28.2%' }}>
          <div className="gps-halo" />
          <div className="gps-ring" />
          <div className="gps-pin" />
        </div>
        <div className="gps-marker" style={{ left:'66.2%', top:'61.2%' }}>
          <div className="gps-halo" />
          <div className="gps-ring" />
          <div className="gps-pin" />
        </div>

        {/* ════ COUCHE 5 — CONTENU ════ */}
        <div className="layout">

          {/* Logo */}
          <div className="logo">
            <div className="logo-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="logo-text-name">Itilib</div>
              <div className="logo-text-sub">Visites à domicile</div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid">

            {/* Left */}
            <div className="col-left">
              <div className="badge">Plateforme professionnelle</div>

              <h1 className="headline">
                <span className="headline-l1">Simplifiez vos visites</span>
                <span className="headline-l2">à domicile.</span>
              </h1>

              <p className="desc">
                Planification, cartographie et kilométrage optimisés<br/>
                pour les professionnels de santé.
              </p>

              <div className="cards">
                {[
                  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h12"/><circle cx="19" cy="18" r="3"/></svg>, title: 'Itinéraires optimisés', desc: 'Réduisez vos déplacements et gagnez du temps.' },
                  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13M12 17V9M16 17V13"/></svg>, title: 'Statistiques détaillées', desc: 'Kilomètres, temps et frais suivis en temps réel.' },
                  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>, title: 'Application PWA', desc: 'Disponible sur tablette, mobile et desktop.' },
                ].map(f => (
                  <div className="card" key={f.title}>
                    <div className="card-icon">{f.icon}</div>
                    <div className="card-title">{f.title}</div>
                    <div className="card-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Form */}
            <div className="col-right">
              {/* ════ COUCHE 6 — FORMULAIRE ════ */}
              <div className="form-card">
                <div className="form-h1">
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
                        <span className="field-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                        <input className="field-input" placeholder="Ex : Sophie, Dr Martin…" value={pseudonyme} onChange={e => setPseudo(e.target.value)} required />
                      </div>
                    </div>
                  )}

                  <div className="field">
                    <label className="field-label">Adresse email</label>
                    <div className="field-wrap">
                      <span className="field-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></span>
                      <input type="email" className="field-input" placeholder="exemple@domaine.fr" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                  </div>

                  {mode !== 'reset' && (
                    <div className="field">
                      <label className="field-label">Mot de passe</label>
                      <div className="field-wrap">
                        <span className="field-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                        <input type={showPwd ? 'text' : 'password'} className="field-input" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                        <button type="button" className="field-eye" onClick={() => setShowPwd(!showPwd)}>
                          {showPwd
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                        </button>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Chargement…'
                      : mode === 'login' ? <><span>Se connecter</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                      : mode === 'register' ? <><span>Créer mon compte</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                      : 'Envoyer le lien'}
                  </button>
                </form>

                <div className="form-links">
                  {mode === 'login' && (<>
                    <button className="lnk" onClick={() => setMode('reset')}>Mot de passe oublié ?</button>
                    <p className="lnk-muted">Pas encore de compte ? <button className="lnk" onClick={() => setMode('register')}>S'inscrire</button></p>
                  </>)}
                  {mode !== 'login' && (
                    <button className="lnk" style={{ color:'#64748B' }} onClick={() => setMode('login')}>← Retour à la connexion</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="footer">
            <span>© 2026 Itilib. Tous droits réservés.</span>
            <div className="footer-links">
              <a href="/mentions-legales">Mentions légales</a>
              <a href="/mentions-legales">Confidentialité</a>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default function AuthPage() {
  return <Suspense fallback={null}><AuthInner /></Suspense>;
}
