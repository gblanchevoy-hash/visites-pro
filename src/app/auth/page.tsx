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
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    if (params.get('reason') === 'inactivity') toast('Déconnecté pour inactivité', { icon: '🔒' });
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
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
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;overflow:hidden;}

        /* ─── ROOT ─── */
        .p{
          font-family:'Inter',-apple-system,sans-serif;
          width:100vw;height:100vh;overflow:hidden;
          background:#FFFFFF;
          position:relative;
        }

        /* ─── HALOS LUMINEUX ─── */
        .h1{position:absolute;pointer-events:none;border-radius:50%;
          width:900px;height:900px;
          right:-200px;top:50%;transform:translateY(-50%);
          background:radial-gradient(circle,rgba(79,125,255,.13) 0%,transparent 70%);
          filter:blur(320px);z-index:0;}
        .h2{position:absolute;pointer-events:none;border-radius:50%;
          width:700px;height:700px;
          left:20%;top:10%;
          background:radial-gradient(circle,rgba(79,125,255,.09) 0%,transparent 65%);
          filter:blur(400px);z-index:0;
          animation:breathe 8s ease-in-out infinite;}
        .h3{position:absolute;pointer-events:none;border-radius:50%;
          width:500px;height:400px;
          left:5%;bottom:0%;
          background:radial-gradient(circle,rgba(79,125,255,.07) 0%,transparent 70%);
          filter:blur(280px);z-index:0;}

        @keyframes breathe{
          0%,100%{opacity:1;transform:scale(1);}
          50%{opacity:.65;transform:scale(1.08);}
        }

        /* ─── GRILLE CENTRALE (zone entre texte et formulaire) ─── */
        .grid-zone{
          position:absolute;
          left:38%;top:12%;
          width:24%;height:76%;
          z-index:1;
          pointer-events:none;
          display:grid;
          grid-template-columns:repeat(5,70px);
          grid-template-rows:repeat(5,70px);
          gap:14px;
          justify-content:center;
          align-content:center;
        }
        .g-cell{
          width:70px;height:70px;border-radius:10px;
          background:#F7F9FC;
          backdrop-filter:blur(4px);
        }

        /* ─── HALO DU TRAJET ─── */
        .route-glow{
          position:absolute;
          left:42%;top:10%;
          width:200px;height:80%;
          z-index:2;pointer-events:none;
          background:linear-gradient(180deg,
            rgba(79,125,255,.20) 0%,
            rgba(79,125,255,.12) 40%,
            rgba(79,125,255,.08) 70%,
            transparent 100%);
          filter:blur(30px);
          opacity:.20;
        }

        /* ─── TRAJET SVG ─── */
        .route-svg{
          position:absolute;
          left:38%;top:8%;
          width:22%;height:84%;
          z-index:3;pointer-events:none;
          filter:drop-shadow(0 0 14px rgba(79,125,255,.30));
        }

        /* ─── MARQUEURS GPS ─── */
        .marker{position:absolute;z-index:4;pointer-events:none;transform:translate(-50%,-50%);}
        .m-glow{position:absolute;border-radius:50%;background:rgba(79,125,255,.22);filter:blur(18px);}
        .m-ring{position:absolute;border-radius:50%;border:2px solid rgba(79,125,255,.55);box-shadow:0 0 18px rgba(79,125,255,.28);}
        .m-dot{border-radius:50%;background:#5B8EFF;position:relative;}

        /* ─── LAYOUT ─── */
        .lay{position:relative;z-index:10;width:100%;height:100%;display:flex;flex-direction:column;}
        .logo-bar{padding:36px 56px 0;display:flex;align-items:center;gap:12px;
          animation:fadeUp .6s ease both;}
        .logo-ic{width:40px;height:40px;border-radius:12px;background:#3B6EFF;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 16px rgba(59,110,255,.30);flex-shrink:0;}
        .logo-n{font-size:17px;font-weight:800;color:#0F172A;letter-spacing:-.3px;line-height:1;}
        .logo-s{font-size:11px;color:#94A3B8;margin-top:2px;}

        /* ─── MAIN GRID ─── */
        .main{flex:1;display:grid;grid-template-columns:58% 42%;padding:0 64px 0 56px;align-items:center;}

        /* ─── COLONNE GAUCHE ─── */
        .cl{display:flex;flex-direction:column;padding-right:0;}

        .badge{
          display:inline-flex;align-items:center;height:38px;padding:0 18px;
          border-radius:999px;background:#EFF6FF;border:1px solid #BFDBFE;
          font-size:12px;font-weight:600;letter-spacing:.09em;color:#3B6EFF;
          text-transform:uppercase;width:fit-content;margin-bottom:40px;
          animation:fadeUp .5s .1s ease both;
        }

        .hl{
          font-size:62px;font-weight:900;line-height:68px;letter-spacing:-2.5px;
          margin-bottom:24px;
          animation:fadeUp .5s .15s ease both;
        }
        .hl1{display:block;color:#0F172A;}
        .hl2{display:block;color:#3B6EFF;}

        .desc{
          font-size:18px;color:#64748B;line-height:1.65;max-width:440px;
          margin-bottom:56px;
          animation:fadeUp .5s .2s ease both;
        }

        /* ─── FEATURE CARDS ─── */
        .cards{display:flex;gap:18px;}
        .card{
          flex:1;border-radius:28px;
          background:#FFFFFF;
          border:1px solid rgba(226,232,240,.8);
          box-shadow:0 12px 40px rgba(15,23,42,.05),0 2px 8px rgba(15,23,42,.03);
          padding:28px 22px 24px;
          display:flex;flex-direction:column;
          transition:transform .25s ease,box-shadow .25s ease;
          cursor:default;
          animation:fadeUp .5s ease both;
        }
        .card:nth-child(1){animation-delay:.22s;}
        .card:nth-child(2){animation-delay:.30s;}
        .card:nth-child(3){animation-delay:.38s;}
        .card:hover{transform:translateY(-5px);box-shadow:0 24px 60px rgba(15,23,42,.09);}
        .ci{width:52px;height:52px;border-radius:14px;background:#EFF6FF;
          display:flex;align-items:center;justify-content:center;margin-bottom:20px;flex-shrink:0;}
        .ct{font-size:14px;font-weight:700;color:#0F172A;margin-bottom:7px;line-height:1.3;}
        .cd{font-size:13px;color:#64748B;line-height:1.55;}

        /* ─── COLONNE DROITE — FORMULAIRE ─── */
        .cr{display:flex;align-items:center;justify-content:center;}

        .fc{
          width:440px;border-radius:36px;
          background:#FFFFFF;
          border:1px solid rgba(226,232,240,.5);
          box-shadow:0 30px 90px rgba(35,70,180,.08),0 4px 16px rgba(15,23,42,.04);
          padding:48px 44px;
          animation:formUp .65s .05s ease both;
        }
        @keyframes formUp{
          from{opacity:0;transform:translateY(10px);}
          to{opacity:1;transform:translateY(0);}
        }

        .fh{font-size:36px;font-weight:900;color:#0F172A;letter-spacing:-1px;margin-bottom:5px;}
        .fs{font-size:16px;color:#94A3B8;margin-bottom:32px;}

        .field{margin-bottom:14px;}
        .fl{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:7px;}
        .fw{position:relative;}
        .fi{
          width:100%;height:62px;border-radius:18px;
          background:#F3F6FD;
          border:1.5px solid transparent;
          padding:0 18px 0 50px;
          font-size:15px;font-family:inherit;color:#0F172A;
          outline:none;transition:border-color .18s,box-shadow .18s,background .18s;
        }
        .fi::placeholder{color:#94A3B8;}
        .fi:focus{border-color:#3B6EFF;background:#FFFFFF;box-shadow:0 0 0 3px rgba(59,110,255,.10);}
        .fic{position:absolute;left:17px;top:50%;transform:translateY(-50%);color:#94A3B8;pointer-events:none;display:flex;align-items:center;}
        .eye{position:absolute;right:16px;top:50%;transform:translateY(-50%);
          background:none;border:none;cursor:pointer;color:#94A3B8;display:flex;align-items:center;
          transition:color .15s;}
        .eye:hover{color:#475569;}

        .btn{
          width:100%;height:60px;border-radius:18px;
          background:linear-gradient(175deg,#3C73FF 0%,#2D5DE8 100%);
          border:none;color:#FFFFFF;
          font-size:16px;font-weight:700;font-family:inherit;
          cursor:pointer;letter-spacing:-.2px;
          display:flex;align-items:center;justify-content:center;gap:10px;
          box-shadow:0 8px 28px rgba(59,110,255,.32),0 2px 6px rgba(59,110,255,.18);
          transition:transform .22s ease,box-shadow .22s ease,opacity .15s;
          margin-top:6px;
        }
        .btn:hover:not(:disabled){
          transform:translateY(-2px);
          box-shadow:0 14px 40px rgba(59,110,255,.42),0 4px 10px rgba(59,110,255,.22);
        }
        .btn:disabled{opacity:.6;cursor:not-allowed;}

        .links{margin-top:22px;display:flex;flex-direction:column;gap:10px;text-align:center;}
        .lk{background:none;border:none;font-family:inherit;font-size:14px;font-weight:500;color:#3B6EFF;cursor:pointer;transition:opacity .15s;}
        .lk:hover{opacity:.72;}
        .lkm{font-size:14px;color:#94A3B8;}

        /* ─── FOOTER ─── */
        .ft{position:relative;z-index:10;display:flex;justify-content:space-between;
          align-items:center;padding:0 56px 22px;}
        .ft span,.ft a{font-size:13px;color:#94A3B8;text-decoration:none;}
        .ftl{display:flex;gap:24px;}
        .ft a:hover{color:#64748B;}

        @keyframes fadeUp{
          from{opacity:0;transform:translateY(14px);}
          to{opacity:1;transform:translateY(0);}
        }

        /* ─── ANIMATION TRAJET ─── */
        .route-path{stroke-dasharray:1200;stroke-dashoffset:1200;animation:drawRoute 2.2s .3s ease forwards;}
        @keyframes drawRoute{to{stroke-dashoffset:0;}}

        @media(max-width:1199px){
          .hl{font-size:48px;line-height:54px;}
          .main{padding:0 40px;}
        }
        @media(max-width:1023px){
          html,body{overflow:auto;}
          .p{height:auto;min-height:100vh;}
          .main{grid-template-columns:1fr;padding:80px 28px 32px;gap:48px;}
          .fc{width:100%;max-width:440px;}
          .grid-zone,.route-svg,.route-glow,.h1,.h2,.h3{display:none;}
        }
      `}</style>

      <div className="p">
        {/* ══ COUCHE 0 — HALOS LUMINEUX ══ */}
        <div className="h1" />
        <div className="h2" />
        <div className="h3" />

        {/* ══ COUCHE 1 — GRILLE CENTRALE ══ */}
        <div className="grid-zone" aria-hidden="true">
          {Array.from({length:25}).map((_,i) => {
            const ops = [.40,.28,.18,.35,.22,.30,.14,.38,.25,.20,.32,.16,.36,.24,.12,.28,.40,.18,.30,.22,.16,.34,.26,.20,.38];
            return <div key={i} className="g-cell" style={{opacity:ops[i]}} />;
          })}
        </div>

        {/* ══ COUCHE 2 — HALO DU TRAJET ══ */}
        <div className="route-glow" />

        {/* ══ COUCHE 3 — TRAJET SVG ══ */}
        <svg className="route-svg" viewBox="0 0 200 800" fill="none" preserveAspectRatio="none">
          <path
            className="route-path"
            d="M 100 10 C 40 60 160 120 120 200 C 80 280 40 320 80 400 C 120 480 160 520 130 600 C 100 680 60 720 90 790"
            stroke="#7AADFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="9 7"
            opacity=".75"
          />
        </svg>

        {/* ══ COUCHE 4 — MARQUEURS GPS ══ */}
        {/* Destination — grand pin en haut */}
        <div className="marker" style={{left:'50%',top:'12%'}}>
          <div className="m-glow" style={{width:'70px',height:'70px',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          <svg width="42" height="52" viewBox="0 0 42 52" fill="none" style={{position:'relative',zIndex:1,filter:'drop-shadow(0 4px 14px rgba(59,110,255,.35))'}}>
            <path d="M21 0C9.402 0 0 9.402 0 21C0 32.598 21 52 21 52C21 52 42 32.598 42 21C42 9.402 32.598 0 21 0Z" fill="#3B6EFF"/>
            <circle cx="21" cy="21" r="9" fill="white"/>
            <circle cx="21" cy="21" r="5" fill="#3B6EFF"/>
          </svg>
          <div style={{width:'20px',height:'7px',borderRadius:'50%',background:'rgba(59,110,255,.30)',margin:'3px auto 0',filter:'blur(4px)'}}/>
        </div>
        {/* Étape 1 */}
        <div className="marker" style={{left:'44%',top:'42%'}}>
          <div className="m-glow" style={{width:'46px',height:'46px',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          <div className="m-ring" style={{width:'34px',height:'34px',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          <div className="m-dot" style={{width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',background:'#EFF6FF',border:'2px solid rgba(59,110,255,.6)',boxShadow:'0 0 16px rgba(59,110,255,.30)'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#3B6EFF'}}/>
          </div>
        </div>
        {/* Étape 2 */}
        <div className="marker" style={{left:'53%',top:'65%'}}>
          <div className="m-glow" style={{width:'40px',height:'40px',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          <div className="m-ring" style={{width:'30px',height:'30px',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          <div className="m-dot" style={{width:'16px',height:'16px',display:'flex',alignItems:'center',justifyContent:'center',background:'#EFF6FF',border:'2px solid rgba(59,110,255,.55)',boxShadow:'0 0 14px rgba(59,110,255,.25)'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#3B6EFF'}}/>
          </div>
        </div>

        {/* ══ COUCHE 5 — CONTENU ══ */}
        <div className="lay">
          {/* Logo */}
          <div className="logo-bar">
            <div className="logo-ic">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="logo-n">Itilib</div>
              <div className="logo-s">Visites à domicile</div>
            </div>
          </div>

          {/* Main */}
          <div className="main">
            {/* ─ Colonne gauche ─ */}
            <div className="cl">
              <div className="badge">Plateforme professionnelle</div>

              <h1 className="hl">
                <span className="hl1">Simplifiez vos visites</span>
                <span className="hl2">à domicile.</span>
              </h1>

              <p className="desc">
                Planification, cartographie et kilométrage optimisés<br/>
                pour les professionnels de santé.
              </p>

              <div className="cards">
                {[
                  {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B6EFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/><path d="M8 11h6M11 8v6"/></svg>,title:'Itinéraires optimisés',desc:'Réduisez vos déplacements et gagnez du temps.'},
                  {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B6EFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13M12 17V9M16 17V13"/></svg>,title:'Statistiques détaillées',desc:'Kilomètres, temps et frais suivis en temps réel.'},
                  {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B6EFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>,title:'Application PWA',desc:'Disponible sur tablette, mobile et desktop.'},
                ].map(f=>(
                  <div key={f.title} className="card">
                    <div className="ci">{f.icon}</div>
                    <div className="ct">{f.title}</div>
                    <div className="cd">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─ Colonne droite — Formulaire ─ */}
            <div className="cr">
              <div className="fc">
                <div className="fh">
                  {mode==='login'?'Connexion':mode==='register'?'Créer un compte':'Réinitialiser'}
                </div>
                <div className="fs">
                  {mode==='login'?'Accédez à votre espace professionnel':mode==='register'?'Commencez à organiser vos tournées':'Recevez un lien par email'}
                </div>

                <form onSubmit={submit}>
                  {mode==='register'&&(
                    <div className="field">
                      <label className="fl">Prénom / Pseudonyme</label>
                      <div className="fw">
                        <span className="fic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                        <input className="fi" placeholder="Ex : Sophie, Dr Martin…" value={pseudonyme} onChange={e=>setPseudo(e.target.value)} required/>
                      </div>
                    </div>
                  )}

                  <div className="field">
                    <label className="fl">Adresse email</label>
                    <div className="fw">
                      <span className="fic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></span>
                      <input type="email" className="fi" placeholder="exemple@domaine.fr" value={email} onChange={e=>setEmail(e.target.value)} required/>
                    </div>
                  </div>

                  {mode!=='reset'&&(
                    <div className="field">
                      <label className="fl">Mot de passe</label>
                      <div className="fw">
                        <span className="fic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                        <input type={showPwd?'text':'password'} className="fi" placeholder="••••••••••" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/>
                        <button type="button" className="eye" onClick={()=>setShowPwd(!showPwd)}>
                          {showPwd
                            ?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            :<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                        </button>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn" disabled={loading}>
                    {loading?'Chargement…':mode==='login'?<><span>Se connecter</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>:mode==='register'?<><span>Créer mon compte</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>:'Envoyer le lien'}
                  </button>
                </form>

                <div className="links">
                  {mode==='login'&&(<>
                    <button className="lk" onClick={()=>setMode('reset')}>Mot de passe oublié ?</button>
                    <p className="lkm">Pas encore de compte ? <button className="lk" onClick={()=>setMode('register')}>S'inscrire</button></p>
                  </>)}
                  {mode!=='login'&&(<button className="lk" style={{color:'#64748B'}} onClick={()=>setMode('login')}>← Retour à la connexion</button>)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="ft">
            <span>© 2026 Itilib. Tous droits réservés.</span>
            <div className="ftl">
              <a href="/mentions-legales">Mentions légales</a>
              <a href="/mentions-legales">Confidentialité</a>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default function AuthPage(){
  return <Suspense fallback={null}><AuthInner/></Suspense>;
}
