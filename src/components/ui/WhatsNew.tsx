'use client';
import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';

const CHANGELOG = [
  {
    version: '1.4',
    date: 'Juillet 2026',
    badge: '🆕 Nouveau',
    badgeColor: '#2563EB',
    items: [
      { icon: '🗺️', text: 'Itinéraires avec trafic réel (HERE Routing) — les temps de trajet s\'adaptent à l\'heure de départ' },
      { icon: '🔄', text: 'Récurrence des rendez-vous — quotidien, hebdomadaire, mensuel ou personnalisé' },
      { icon: '⚠️', text: 'Alertes de chevauchement — détection automatique des conflits d\'horaire' },
      { icon: '🌤️', text: 'Météo matin et après-midi pour chaque jour des 7 prochains jours' },
      { icon: '📊', text: 'Synchronisation automatique tournées → frais kilométriques → rapport fiscal' },
    ],
  },
  {
    version: '1.3',
    date: 'Juin 2026',
    badge: '✨ Amélioré',
    badgeColor: '#7C3AED',
    items: [
      { icon: '📍', text: 'Géocodage amélioré avec Photon (bâtiments, résidences, POI)' },
      { icon: '🗒️', text: 'Pense-bête dans le bandeau — notes colorées accessibles partout' },
      { icon: '🛣️', text: 'Alerte autoroute sur les segments de tournée' },
      { icon: '📱', text: 'Application optimisée tablette et mobile' },
    ],
  },
  {
    version: '1.2',
    date: 'Mai 2026',
    badge: '🔧 Corrections',
    badgeColor: '#10B981',
    items: [
      { icon: '📧', text: 'Email de confirmation brandé Itilib' },
      { icon: '🔐', text: 'Page de réinitialisation de mot de passe' },
      { icon: '⚖️', text: 'Pages légales : mentions légales, confidentialité, CGU' },
    ],
  },
];

const STORAGE_KEY = 'itilib_last_seen_version';
const LATEST_VERSION = CHANGELOG[0].version;

export default function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== LATEST_VERSION) setHasNew(true);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setHasNew(false);
    localStorage.setItem(STORAGE_KEY, LATEST_VERSION);
  };

  return (
    <>
      <button onClick={handleOpen} title="Nouveautés"
        style={{ position:'relative', display:'flex', alignItems:'center', gap:'5px', padding:'6px 10px', borderRadius:'10px', background: hasNew ? '#EFF6FF' : '#F8FAFC', border:`1px solid ${hasNew ? '#BFDBFE' : '#E2E8F0'}`, cursor:'pointer', color: hasNew ? '#2563EB' : '#64748B', fontSize:'12px', fontWeight: hasNew ? 600 : 400, transition:'all .15s', flexShrink:0 }}>
        <Sparkles style={{ width:'13px', height:'13px' }} />
        <span className="hidden sm:inline">Nouveautés</span>
        {hasNew && <span style={{ position:'absolute', top:'-4px', right:'-4px', width:'10px', height:'10px', borderRadius:'50%', background:'#2563EB', border:'2px solid #fff' }} />}
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(15,23,42,.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}
          onClick={() => setOpen(false)}>
          <div style={{ background:'#fff', borderRadius:'24px', width:'100%', maxWidth:'520px', maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(15,23,42,.20)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:'24px 28px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <Sparkles style={{ width:'18px', height:'18px', color:'#2563EB' }} />
                  <h2 style={{ fontSize:'18px', fontWeight:800, color:'#0F172A' }}>Nouveautés Itilib</h2>
                </div>
                <p style={{ fontSize:'13px', color:'#94A3B8', marginTop:'2px' }}>Toutes les dernières améliorations</p>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#F8FAFC', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B' }}>
                <X style={{ width:'16px', height:'16px' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ overflowY:'auto', padding:'20px 28px 28px' }}>
              {CHANGELOG.map((release, ri) => (
                <div key={release.version} style={{ marginBottom: ri < CHANGELOG.length - 1 ? '28px' : 0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                    <span style={{ fontSize:'12px', fontWeight:700, padding:'3px 10px', borderRadius:'6px', background: ri === 0 ? '#EFF6FF' : '#F8FAFC', color: ri === 0 ? '#2563EB' : '#64748B' }}>
                      {release.badge}
                    </span>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#0F172A' }}>v{release.version}</span>
                    <span style={{ fontSize:'12px', color:'#94A3B8' }}>· {release.date}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {release.items.map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 14px', background:'#F8FAFC', borderRadius:'10px' }}>
                        <span style={{ fontSize:'16px', flexShrink:0, lineHeight:1.4 }}>{item.icon}</span>
                        <span style={{ fontSize:'13px', color:'#374151', lineHeight:1.55 }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
