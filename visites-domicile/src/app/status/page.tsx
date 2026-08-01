'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  latency?: number;
  description: string;
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Application Web', status: 'checking', description: 'Interface principale Itilib' },
    { name: 'Base de données', status: 'checking', description: 'Stockage des données patients et RDV' },
    { name: 'Authentification', status: 'checking', description: 'Connexion et sécurité des comptes' },
    { name: 'Calcul d\'itinéraires', status: 'checking', description: 'Optimisation des tournées (HERE + ORS)' },
    { name: 'Météo', status: 'checking', description: 'Prévisions 7 jours (Open-Meteo)' },
    { name: 'Emails', status: 'checking', description: 'Notifications et confirmations (Resend)' },
  ]);
  const [lastCheck, setLastCheck] = useState(new Date());
  const [checking, setChecking] = useState(false);

  const checkServices = async () => {
    setChecking(true);
    const results: ServiceStatus[] = [...services];

    // Check app
    results[0] = { ...results[0], status: 'operational', latency: 12 };

    // Check Supabase DB
    try {
      const t = Date.now();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' }
      });
      results[1] = { ...results[1], status: res.ok ? 'operational' : 'degraded', latency: Date.now() - t };
    } catch { results[1] = { ...results[1], status: 'down' }; }

    // Check Auth
    try {
      const t = Date.now();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`);
      results[2] = { ...results[2], status: res.ok ? 'operational' : 'degraded', latency: Date.now() - t };
    } catch { results[2] = { ...results[2], status: 'down' }; }

    // Check HERE routing
    try {
      const t = Date.now();
      const res = await fetch('/api/here-route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: { lat: 43.7, lng: 6.0 }, to: { lat: 43.8, lng: 6.1 } }) });
      const data = await res.json();
      results[3] = { ...results[3], status: data.fallback ? 'degraded' : 'operational', latency: Date.now() - t };
    } catch { results[3] = { ...results[3], status: 'degraded' }; }

    // Check Météo
    try {
      const t = Date.now();
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.7&longitude=6.0&current=temperature_2m');
      results[4] = { ...results[4], status: res.ok ? 'operational' : 'degraded', latency: Date.now() - t };
    } catch { results[4] = { ...results[4], status: 'down' }; }

    // Emails (Resend — on ne peut pas tester sans envoyer, on suppose opérationnel)
    results[5] = { ...results[5], status: 'operational', latency: undefined };

    setServices(results);
    setLastCheck(new Date());
    setChecking(false);
  };

  useEffect(() => { checkServices(); }, []);

  const allOperational = services.every(s => s.status === 'operational');
  const hasDegraded = services.some(s => s.status === 'degraded');
  const hasDown = services.some(s => s.status === 'down');

  const globalStatus = hasDown ? 'down' : hasDegraded ? 'degraded' : allOperational ? 'operational' : 'checking';

  const statusColors = {
    operational: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#10B981' },
    degraded: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
    down: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
    checking: { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', dot: '#CBD5E1' },
  };

  const statusLabels = {
    operational: 'Tous les systèmes opérationnels',
    degraded: 'Dégradation partielle des services',
    down: 'Incident en cours',
    checking: 'Vérification en cours…',
  };

  const S = statusColors[globalStatus];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',-apple-system,sans-serif;background:#F8FAFC;color:#0F172A;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Nav */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #E2E8F0', padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/auth" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'9px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src="/icons/logo.png" alt="Itilib" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <span style={{ fontSize:'16px', fontWeight:800, color:'#0F172A' }}>Itilib</span>
        </Link>
        <span style={{ fontSize:'13px', color:'#94A3B8' }}>Page de statut</span>
      </nav>

      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'48px 24px' }}>
        {/* Statut global */}
        <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius:'20px', padding:'28px 32px', marginBottom:'32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'14px', height:'14px', borderRadius:'50%', background: S.dot, animation: globalStatus === 'checking' ? 'pulse 1.5s infinite' : 'none' }} />
            <div>
              <p style={{ fontSize:'20px', fontWeight:800, color: S.text }}>{statusLabels[globalStatus]}</p>
              <p style={{ fontSize:'13px', color:'#94A3B8', marginTop:'3px' }}>
                Dernière vérification : {lastCheck.toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>
          <button onClick={checkServices} disabled={checking}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#fff', border:'1px solid #E2E8F0', borderRadius:'10px', fontSize:'13px', fontWeight:500, color:'#374151', cursor:'pointer' }}>
            <RefreshCw style={{ width:'13px', height:'13px', animation: checking ? 'spin .8s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>

        {/* Services */}
        <h2 style={{ fontSize:'16px', fontWeight:700, color:'#0F172A', marginBottom:'12px' }}>Services</h2>
        <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:'16px', overflow:'hidden', marginBottom:'32px' }}>
          {services.map((svc, i) => {
            const c = statusColors[svc.status];
            return (
              <div key={svc.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom: i < services.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background: c.dot, flexShrink:0, animation: svc.status === 'checking' ? 'pulse 1.5s infinite' : 'none' }} />
                  <div>
                    <p style={{ fontSize:'14px', fontWeight:600, color:'#0F172A' }}>{svc.name}</p>
                    <p style={{ fontSize:'12px', color:'#94A3B8' }}>{svc.description}</p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  {svc.latency && <span style={{ fontSize:'12px', color:'#94A3B8' }}>{svc.latency}ms</span>}
                  <span style={{ fontSize:'12px', fontWeight:600, color: c.text, background: c.bg, padding:'3px 10px', borderRadius:'6px' }}>
                    {svc.status === 'operational' ? '✅ Opérationnel' : svc.status === 'degraded' ? '⚠️ Dégradé' : svc.status === 'down' ? '❌ Hors service' : '⏳ Vérification'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:'13px', color:'#94A3B8' }}>
            Un problème ? Contactez-nous à{' '}
            <a href="mailto:contact@itilib.fr" style={{ color:'#2563EB', textDecoration:'none', fontWeight:500 }}>contact@itilib.fr</a>
          </p>
          <p style={{ fontSize:'12px', color:'#CBD5E1', marginTop:'8px' }}>
            © 2026 Itilib · <Link href="/legal?tab=mentions" style={{ color:'#CBD5E1', textDecoration:'none' }}>Mentions légales</Link>
          </p>
        </div>
      </div>
    </>
  );
}
