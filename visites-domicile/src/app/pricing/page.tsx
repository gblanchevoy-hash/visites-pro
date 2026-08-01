'use client';
import Link from 'next/link';
import { Check, Zap, Users, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/lib/stores/appStore';

const FEATURES_SOLO = [
  'Patients illimités',
  'Planning semaine/mois',
  'Tournées optimisées',
  'Calcul kilométrique automatique',
  'Rapport fiscal PDF annuel',
  'Messagerie interne sécurisée',
  'Calculateur AGGIR',
  'Météo et prévisions 7 jours',
  'Pense-bête intégré',
  'Alerte autoroute',
  'Export Excel/PDF',
  'PWA mobile & tablette',
];

const FEATURES_CABINET = [
  'Tout le plan Solo',
  "Jusqu'à 5 comptes liés",
  'Partage de patients entre collègues',
  'Messagerie inter-cabinet',
  'Tableau de bord cabinet',
];

export default function PricingPage() {
  const { user } = useAppStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: 'solo' | 'cabinet') => {
    if (!user) { window.location.href = '/auth?tab=register'; return; }
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId: user.id, email: user.email }),
      });
      const { url, error } = await res.json();
      if (error) { alert('Erreur : ' + error); setLoading(null); return; }
      window.location.href = url;
    } catch { setLoading(null); }
  };
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',-apple-system,sans-serif;background:#F8FAFC;color:#0F172A;}
      @keyframes spin{to{transform:rotate(360deg);}}`}</style>

      {/* Nav */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #E2E8F0', padding:'16px 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/auth" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(37,99,235,.25)' }}>
            <img src="/icons/logo.png" alt="Itilib" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <span style={{ fontSize:'17px', fontWeight:800, color:'#0F172A' }}>Itilib</span>
        </Link>
        <Link href="/auth" style={{ fontSize:'14px', fontWeight:500, color:'#2563EB', textDecoration:'none' }}>
          Se connecter →
        </Link>
      </nav>

      {/* Header */}
      <div style={{ textAlign:'center', padding:'64px 24px 48px' }}>

        <img src="/icons/logo-large.png" alt="Itilib" style={{ width:'140px', height:'140px', borderRadius:'32px', boxShadow:'0 16px 40px rgba(37,99,235,.35)', margin:'0 auto 32px' }} />

        <h1 style={{ fontSize:'48px', fontWeight:900, color:'#0F172A', letterSpacing:'-1.5px', marginBottom:'16px' }}>
          Tarifs simples et transparents
        </h1>
        <p style={{ fontSize:'18px', color:'#64748B', maxWidth:'500px', margin:'0 auto' }}>
          Essayez gratuitement pendant 30 jours. Pas de carte bancaire requise.
        </p>
      </div>

      {/* Plans */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:'24px', maxWidth:'900px', margin:'0 auto 80px', padding:'0 24px' }}>

        {/* Plan Solo */}
        <div style={{ background:'linear-gradient(135deg,#1E40AF,#2563EB)', border:'none', borderRadius:'24px', padding:'36px', boxShadow:'0 20px 60px rgba(37,99,235,.30)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'20px', right:'20px', background:'rgba(255,255,255,.2)', borderRadius:'999px', padding:'4px 12px', fontSize:'12px', fontWeight:700, color:'#fff' }}>
            LE PLUS POPULAIRE
          </div>
          <div style={{ marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
              <Zap style={{ width:'18px', height:'18px', color:'#FCD34D' }} />
              <p style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,.75)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Solo</p>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'4px', marginBottom:'8px' }}>
              <span style={{ fontSize:'48px', fontWeight:900, color:'#fff' }}>7,90€</span>
              <span style={{ fontSize:'14px', color:'rgba(255,255,255,.7)' }}>HT/mois</span>
            </div>
            <p style={{ fontSize:'14px', color:'rgba(255,255,255,.65)' }}>30 jours gratuits · puis 7,90€ HT/mois</p>
          </div>
          <button onClick={() => handleCheckout('solo')} disabled={loading === 'solo'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'14px', background:'#fff', borderRadius:'14px', fontSize:'15px', fontWeight:700, color:'#2563EB', border:'none', cursor:'pointer', marginBottom:'28px' }}>
            {loading === 'solo' ? <Loader2 style={{ width:'16px', height:'16px', animation:'spin .8s linear infinite' }} /> : <><span>Essai 30 jours gratuit</span><ArrowRight style={{ width:'16px', height:'16px' }} /></>}
          </button>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.15)', paddingTop:'24px' }}>
            <p style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'14px' }}>Tout inclus</p>
            {FEATURES_SOLO.map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                <Check style={{ width:'16px', height:'16px', color:'#6EE7B7', flexShrink:0 }} />
                <span style={{ fontSize:'14px', color:'rgba(255,255,255,.85)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Cabinet */}
        <div style={{ background:'#fff', border:'2px solid #E2E8F0', borderRadius:'24px', padding:'36px', boxShadow:'0 4px 16px rgba(15,23,42,.05)' }}>
          <div style={{ marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
              <Users style={{ width:'18px', height:'18px', color:'#7C3AED' }} />
              <p style={{ fontSize:'13px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.08em' }}>Cabinet</p>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'4px', marginBottom:'8px' }}>
              <span style={{ fontSize:'48px', fontWeight:900, color:'#0F172A' }}>19,90€</span>
              <span style={{ fontSize:'14px', color:'#64748B' }}>HT/mois</span>
            </div>
            <p style={{ fontSize:'14px', color:'#94A3B8' }}>30 jours gratuits · puis 19,90€ HT/mois</p>
          </div>
          <button onClick={() => handleCheckout('cabinet')} disabled={loading === 'cabinet'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'14px', background:'#7C3AED', borderRadius:'14px', fontSize:'15px', fontWeight:600, color:'#fff', border:'none', cursor:'pointer', marginBottom:'28px' }}>
            {loading === 'cabinet' ? <Loader2 style={{ width:'16px', height:'16px', animation:'spin .8s linear infinite' }} /> : <><span>Essai 30 jours gratuit</span><ArrowRight style={{ width:'16px', height:'16px' }} /></>}
          </button>
          <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:'24px' }}>
            <p style={{ fontSize:'12px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'14px' }}>Tout Solo +</p>
            {FEATURES_CABINET.map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                <Check style={{ width:'16px', height:'16px', color:'#7C3AED', flexShrink:0 }} />
                <span style={{ fontSize:'14px', color:'#475569' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth:'640px', margin:'0 auto 80px', padding:'0 24px' }}>
        <h2 style={{ fontSize:'28px', fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:'40px', letterSpacing:'-0.5px' }}>Questions fréquentes</h2>
        {[
          { q:"L'essai gratuit nécessite-t-il une carte bancaire ?", r:"Non. Vous accédez à toutes les fonctionnalités pendant 30 jours sans renseigner aucune information de paiement." },
          { q:"Les prix sont-ils HT ou TTC ?", r:"Nos prix sont indiqués hors taxes (HT). En tant que professionnel en franchise de TVA (art. 293 B du CGI), aucune TVA n'est appliquée sur vos factures." },
          { q:"Que se passe-t-il après les 30 jours ?", r:"Vous recevez un email de rappel 7 jours avant la fin. Si vous ne souscrivez pas, votre compte passe en lecture seule — vos données sont conservées." },
          { q:"Puis-je annuler à tout moment ?", r:"Oui. Aucun engagement, annulation en 1 clic depuis votre compte. Vous gardez accès jusqu'à la fin de la période payée." },
          { q:"Mes données sont-elles sécurisées ?", r:"Oui. Toutes les données sont chiffrées et isolées par compte via Supabase (PostgreSQL, hébergé en Europe)." },
          { q:"Puis-je passer du plan Solo au plan Cabinet ?", r:"Oui, à tout moment depuis votre espace compte. La différence est facturée au prorata." },
        ].map(({ q, r }) => (
          <div key={q} style={{ borderBottom:'1px solid #F1F5F9', padding:'20px 0' }}>
            <p style={{ fontSize:'15px', fontWeight:600, color:'#0F172A', marginBottom:'8px' }}>{q}</p>
            <p style={{ fontSize:'14px', color:'#64748B', lineHeight:1.7 }}>{r}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid #E2E8F0', padding:'24px 48px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ fontSize:'13px', color:'#94A3B8' }}>© 2026 Itilib · <a href="mailto:contact@itilib.fr" style={{ color:'#2563EB', textDecoration:'none' }}>contact@itilib.fr</a></p>
        <div style={{ display:'flex', gap:'20px' }}>
          <Link href="/legal?tab=mentions" style={{ fontSize:'13px', color:'#94A3B8', textDecoration:'none' }}>Mentions légales</Link>
          <Link href="/legal?tab=confidentialite" style={{ fontSize:'13px', color:'#94A3B8', textDecoration:'none' }}>Confidentialité</Link>
          <Link href="/legal?tab=cgu" style={{ fontSize:'13px', color:'#94A3B8', textDecoration:'none' }}>CGU</Link>
        </div>
      </footer>
    </>
  );
}
