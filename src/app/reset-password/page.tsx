'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [ready, setReady]         = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    // Supabase envoie le token via le fragment URL (#access_token=...)
    // On vérifie que la session est bien établie via le lien magique
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Si déjà connecté via le lien de reset
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    toast.success('Mot de passe mis à jour !');
    setTimeout(() => router.replace('/dashboard'), 1500);
    setLoading(false);
  };

  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 && !/[A-Z]/.test(password) ? 2
    : 3;

  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',-apple-system,sans-serif;background:#F8FAFC;min-height:100vh;display:flex;align-items:center;justify-content:center;}
      `}</style>

      <div style={{ width:'100%', minHeight:'100vh', background:'#F8FAFC', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'40px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'11px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(37,99,235,.30)' }}>
            <img src="/icons/logo.png" alt="Itilib" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div>
            <p style={{ fontSize:'17px', fontWeight:800, color:'#0F172A', lineHeight:1 }}>Itilib</p>
            <p style={{ fontSize:'11px', color:'#94A3B8', marginTop:'2px' }}>Visites à domicile</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ width:'100%', maxWidth:'420px', background:'#FFFFFF', borderRadius:'28px', padding:'40px 36px', boxShadow:'0 20px 60px rgba(15,23,42,.08)', border:'1px solid #E2E8F0' }}>

          <h1 style={{ fontSize:'26px', fontWeight:900, color:'#0F172A', letterSpacing:'-0.5px', marginBottom:'6px' }}>
            Nouveau mot de passe
          </h1>
          <p style={{ fontSize:'14px', color:'#94A3B8', marginBottom:'28px' }}>
            Choisissez un mot de passe sécurisé pour votre compte Itilib.
          </p>

          {!ready ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', border:'3px solid #DBEAFE', borderTop:'3px solid #2563EB', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }} />
              <p style={{ fontSize:'14px', color:'#64748B' }}>Vérification du lien…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Nouveau mot de passe */}
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'7px' }}>
                  Nouveau mot de passe
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', color:'#94A3B8', display:'flex' }}>
                    <Lock style={{ width:'17px', height:'17px' }} />
                  </span>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    style={{ width:'100%', height:'56px', borderRadius:'14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', padding:'0 44px 0 46px', fontSize:'15px', fontFamily:'inherit', color:'#0F172A', outline:'none' }}
                    placeholder="8 caractères minimum"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required minLength={8}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', alignItems:'center' }}>
                    {showPwd ? <EyeOff style={{ width:'17px', height:'17px' }} /> : <Eye style={{ width:'17px', height:'17px' }} />}
                  </button>
                </div>
                {/* Indicateur de force */}
                {password.length > 0 && (
                  <div style={{ marginTop:'8px' }}>
                    <div style={{ display:'flex', gap:'4px', marginBottom:'4px' }}>
                      {[1,2,3].map(i => (
                        <div key={i} style={{ height:'3px', flex:1, borderRadius:'2px', background: i <= strength ? strengthColor[strength] : '#E2E8F0', transition:'background 0.2s' }} />
                      ))}
                    </div>
                    <p style={{ fontSize:'11px', color: strengthColor[strength], fontWeight:500 }}>{strengthLabel[strength]}</p>
                  </div>
                )}
              </div>

              {/* Confirmation */}
              <div style={{ marginBottom:'20px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'7px' }}>
                  Confirmer le mot de passe
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', color:'#94A3B8', display:'flex' }}>
                    <Lock style={{ width:'17px', height:'17px' }} />
                  </span>
                  <input
                    type={showConf ? 'text' : 'password'}
                    style={{ width:'100%', height:'56px', borderRadius:'14px', background:'#F8FAFC', border: `1.5px solid ${confirm && confirm !== password ? '#EF4444' : confirm && confirm === password ? '#10B981' : '#E2E8F0'}`, padding:'0 44px 0 46px', fontSize:'15px', fontFamily:'inherit', color:'#0F172A', outline:'none' }}
                    placeholder="Répétez votre mot de passe"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowConf(!showConf)}
                    style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', alignItems:'center' }}>
                    {showConf ? <EyeOff style={{ width:'17px', height:'17px' }} /> : <Eye style={{ width:'17px', height:'17px' }} />}
                  </button>
                  {confirm && confirm === password && (
                    <CheckCircle2 style={{ position:'absolute', right:'44px', top:'50%', transform:'translateY(-50%)', width:'16px', height:'16px', color:'#10B981' }} />
                  )}
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'10px', marginBottom:'16px' }}>
                  <AlertCircle style={{ width:'16px', height:'16px', color:'#EF4444', flexShrink:0 }} />
                  <p style={{ fontSize:'13px', color:'#DC2626' }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width:'100%', height:'56px', borderRadius:'14px', background: loading ? '#93C5FD' : 'linear-gradient(175deg,#2563EB,#1D4ED8)', border:'none', color:'#fff', fontSize:'15px', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow:'0 6px 20px rgba(37,99,235,.28)', transition:'all .2s', fontFamily:'inherit' }}>
                {loading ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          )}
        </div>

        <p style={{ fontSize:'13px', color:'#94A3B8', marginTop:'24px' }}>
          <a href="/auth" style={{ color:'#2563EB', textDecoration:'none', fontWeight:500 }}>← Retour à la connexion</a>
        </p>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordInner /></Suspense>;
}
