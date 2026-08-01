'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { Phone, Calculator, ChevronDown, ChevronUp, Printer } from 'lucide-react';

// ── Numéros utiles ──
const NUMEROS = [
  { cat: 'Urgences', color: '#EF4444', bg: '#FEF2F2', nums: [
    { label: 'SAMU', num: '15', desc: 'Urgences médicales' },
    { label: 'Police / Gendarmerie', num: '17', desc: '' },
    { label: 'Pompiers', num: '18', desc: '' },
    { label: "Numéro d'urgence européen", num: '112', desc: "Valable dans toute l'Europe" },
  ]},
  { cat: 'Protection personnes âgées', color: '#8B5CF6', bg: '#F5F3FF', nums: [
    { label: 'Maltraitance personnes âgées / handicapées', num: '3977', desc: 'Allô Maltraitance — 7j/7' },
    { label: 'Espace national Personnes Agées', num: '3179', desc: '' },
  ]},
  { cat: 'Protection enfants', color: '#F59E0B', bg: '#FFFBEB', nums: [
    { label: 'Enfance en danger', num: '119', desc: 'SNATED — 24h/24, 7j/7, gratuit' },
    { label: 'Aide aux victimes', num: '116006', desc: '' },
  ]},
  { cat: 'Protection animaux', color: '#10B981', bg: '#F0FDF4', nums: [
    { label: 'SPA / signalement maltraitance animale', num: '01 43 80 40 66', desc: 'SPA nationale' },
    { label: 'Gendarmerie (signalement)', num: '17', desc: 'Pour maltraitance animale' },
  ]},
  { cat: 'Santé mentale & Prévention suicide', color: '#2563EB', bg: '#EFF6FF', nums: [
    { label: 'Prévention du suicide', num: '3114', desc: 'Numéro national — 24h/24' },
    { label: 'SOS Amitié', num: '09 72 39 40 50', desc: '24h/24' },
  ]},
  { cat: 'Soins & Santé', color: '#0891B2', bg: '#F0FDFA', nums: [
    { label: 'Médecin de garde', num: '15', desc: 'Via le SAMU' },
    { label: 'Pharmacie de garde', num: '3237', desc: '' },
    { label: 'Centre antipoison', num: '0800 59 59 59', desc: 'Gratuit' },
  ]},
];

// ── Grille AGGIR ──
const ITEMS_AGGIR = [
  { id: 'coherence', label: 'Cohérence', desc: 'Converser et/ou se comporter de façon sensée' },
  { id: 'orientation', label: 'Orientation', desc: 'Se repérer dans le temps, les lieux et les espaces' },
  { id: 'toilette', label: 'Toilette', desc: 'Assurer son hygiène corporelle' },
  { id: 'habillage', label: 'Habillage', desc: 'S\'habiller, se déshabiller, se présenter' },
  { id: 'alimentation', label: 'Alimentation', desc: 'Se servir et manger les aliments' },
  { id: 'elimination', label: 'Élimination', desc: 'Assumer l\'hygiène de l\'élimination urinaire et fécale' },
  { id: 'transferts', label: 'Transferts', desc: 'Se lever, se coucher, s\'asseoir' },
  { id: 'deplacements_int', label: 'Déplacements intérieurs', desc: 'Avec/sans appareillage ou aide technique' },
  { id: 'deplacements_ext', label: 'Déplacements extérieurs', desc: 'Hors du domicile' },
  { id: 'communication', label: 'Communication à distance', desc: 'Utiliser les moyens de communication' },
  { id: 'gestion', label: 'Gestion', desc: 'Gérer ses affaires, son budget, ses biens' },
  { id: 'cuisine', label: 'Cuisine', desc: 'Préparer ses repas et les conditions de la préparation' },
  { id: 'menage', label: 'Ménage', desc: 'Effectuer l\'ensemble des travaux ménagers' },
  { id: 'transports', label: 'Transports', desc: 'Prendre et utiliser un moyen de transport' },
  { id: 'achats', label: 'Achats', desc: 'Effectuer ses achats personnels' },
  { id: 'suivi_traitement', label: 'Suivi du traitement', desc: 'Gérer et respecter son traitement' },
  { id: 'activites_temps_libre', label: 'Activités de temps libre', desc: 'Exercer des activités de loisirs' },
];

const SCORES: Record<string, number> = { A: 1, B: 2, C: 3 };
const SCORE_LABELS: Record<string, string> = { A: 'A — Fait seul', B: 'B — Fait partiellement', C: 'C — Ne fait pas' };
const GIR_THRESHOLDS = [
  { gir: 1, label: 'GIR 1', desc: 'Personnes confinées au lit/fauteuil, fonctions mentales très altérées', max: 17 },
  { gir: 2, label: 'GIR 2', desc: 'Personnes confinées au lit/fauteuil, fonctions mentales peu altérées ou autonomes mentalement mais totalement dépendantes', max: 22 },
  { gir: 3, label: 'GIR 3', desc: 'Personnes ayant conservé leur autonomie mentale mais nécessitant des aides pour les soins corporels', max: 29 },
  { gir: 4, label: 'GIR 4', desc: 'Personnes n\'assumant pas seules leur transferts mais se déplaçant dans leur logement; aides à la toilette et à l\'habillage', max: 36 },
  { gir: 5, label: 'GIR 5', desc: 'Personnes assurant seules leurs déplacements intérieurs, s\'alimentant, se coiffant. Aides ponctuelles pour la toilette et la préparation des repas', max: 44 },
  { gir: 6, label: 'GIR 6', desc: 'Personnes n\'ayant pas perdu leur autonomie pour les actes essentiels', max: 51 },
];

function calcGIR(scores: Record<string, string>): { score: number; gir: number; label: string; desc: string } | null {
  const vals = Object.values(scores);
  if (vals.length < ITEMS_AGGIR.length) return null;
  const total = vals.reduce((sum, v) => sum + (SCORES[v] ?? 1), 0);
  const found = GIR_THRESHOLDS.find(t => total <= t.max) ?? GIR_THRESHOLDS[GIR_THRESHOLDS.length - 1];
  return { score: total, gir: found.gir, label: found.label, desc: found.desc };
}

export default function OutilsPage() {
  const [tab, setTab] = useState<'numeros' | 'aggir'>('numeros');
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [patientName, setPatientName] = useState('');
  const [showResult, setShowResult] = useState(false);

  const result = calcGIR(scores);
  const filled = Object.keys(scores).length;

  const handlePrint = () => window.print();

  return (
    <AppShell>
      <Topbar title="Outils" subtitle="Calculateur AGGIR et numéros utiles" />
      <div className="flex-1 overflow-auto p-4 lg:p-6">

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 mb-6 w-fit">
          <button onClick={() => setTab('numeros')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'numeros' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Phone className="w-4 h-4" /> Numéros utiles
          </button>
          <button onClick={() => setTab('aggir')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'aggir' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Calculator className="w-4 h-4" /> Grille AGGIR
          </button>
        </div>

        {/* ── Numéros utiles ── */}
        {tab === 'numeros' && (
          <div className="max-w-2xl space-y-3">
            {NUMEROS.map(cat => (
              <div key={cat.cat} style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:'14px', overflow:'hidden', marginBottom:'8px', boxShadow:'0 2px 6px rgba(15,23,42,0.04)' }}>
                <button onClick={() => setOpenCat(openCat === cat.cat ? null : cat.cat)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'none', border:'none', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:cat.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:cat.color, display:'block' }} />
                    </div>
                    <span style={{ fontSize:'14px', fontWeight:600, color:'#0F172A' }}>{cat.cat}</span>
                    <span style={{ fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'999px', background:cat.bg, color:cat.color }}>{cat.nums.length}</span>
                  </div>
                  {openCat === cat.cat ? <ChevronUp style={{ width:'16px', height:'16px', color:'#94A3B8' }} /> : <ChevronDown style={{ width:'16px', height:'16px', color:'#94A3B8' }} />}
                </button>
                {openCat === cat.cat && (
                  <div style={{ borderTop:'1px solid #F1F5F9' }}>
                    {cat.nums.map(n => (
                      <div key={n.num} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #F8FAFC', gap:'12px' }}>
                        <div>
                          <p style={{ fontSize:'13px', fontWeight:600, color:'#0F172A', marginBottom:'2px' }}>{n.label}</p>
                          {n.desc && <p style={{ fontSize:'11px', color:'#94A3B8' }}>{n.desc}</p>}
                        </div>
                        <a href={`tel:${n.num.replace(/\s/g,'')}`}
                          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:cat.bg, color:cat.color, border:`1px solid ${cat.color}33`, borderRadius:'10px', fontSize:'13px', fontWeight:700, textDecoration:'none', flexShrink:0 }}>
                          <Phone style={{ width:'13px', height:'13px' }} /> {n.num}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Grille AGGIR ── */}
        {tab === 'aggir' && (
          <div className="max-w-2xl">
            <div className="card p-5 mb-4">
              <h2 className="font-semibold text-slate-900 mb-1">Évaluation AGGIR</h2>
              <p className="text-xs text-slate-500 mb-4">
                Autonomie Gérontologique Groupes Iso-Ressources. Évaluez chaque item :<br />
                <strong>A</strong> = fait seul · <strong>B</strong> = fait partiellement · <strong>C</strong> = ne fait pas
              </p>
              <div className="mb-4">
                <label className="label">Nom du patient (optionnel)</label>
                <input className="input" placeholder="M. Dupont…" value={patientName} onChange={e => setPatientName(e.target.value)} />
              </div>
              <div className="space-y-2">
                {ITEMS_AGGIR.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {(['A','B','C'] as const).map(v => (
                        <button key={v} onClick={() => setScores(s => ({ ...s, [item.id]: v }))}
                          className={`w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all ${
                            scores[item.id] === v
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-slate-400">{filled} / {ITEMS_AGGIR.length} items remplis</p>
                <div className="flex gap-2">
                  <button onClick={() => setScores({})} className="btn-secondary text-xs">Réinitialiser</button>
                  <button onClick={() => setShowResult(true)} disabled={filled < ITEMS_AGGIR.length}
                    className="btn-primary text-xs">Calculer le GIR</button>
                </div>
              </div>
            </div>

            {/* Result */}
            {showResult && result && (
              <div className="card p-6 border-2 border-primary-200 bg-primary-50/30 no-print">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Résultat</p>
                    <p className="text-4xl font-black text-primary-700">{result.label}</p>
                    <p className="text-sm text-slate-600 mt-1">{result.desc}</p>
                    {patientName && <p className="text-xs text-slate-400 mt-2">Patient : {patientName}</p>}
                    <p className="text-xs text-slate-400">Score total : {result.score} / {ITEMS_AGGIR.length * 3}</p>
                  </div>
                  <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl font-black text-white">{result.gir}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
                    <Printer className="w-4 h-4" /> Imprimer / Export PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .card { visibility: visible !important; }
          .card * { visibility: visible !important; }
        }
      `}</style>
    </AppShell>
  );
}
