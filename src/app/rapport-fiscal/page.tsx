'use client';
import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { FileText, Printer, Download, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const BAREME_URSSAF_2024 = 0.620;

interface FraisEntry {
  mois: number; km_parcourus: number; bareme: number; montant_total: number;
}

interface RdvStats {
  mois: number; nb_visites: number; nb_patients: number;
}

export default function RapportFiscalPage() {
  const { user, settings } = useAppStore();
  const [selectedYear, setYear] = useState(new Date().getFullYear());
  const [frais, setFrais]       = useState<FraisEntry[]>([]);
  const [rdvStats, setRdvStats] = useState<RdvStats[]>([]);
  const [loading, setLoading]   = useState(true);
  const [nomPro, setNomPro]     = useState('');
  const [adressePro, setAdressePro] = useState('');
  const [siret, setSiret]       = useState('');
  const [profession, setProfession] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from('frais_kilometriques').select('mois,km_parcourus,bareme,montant_total')
        .eq('user_id', user.id).eq('annee', selectedYear).order('mois'),
      supabase.from('rendez_vous').select('date,patient_id')
        .eq('user_id', user.id)
        .gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`)
        .neq('statut', 'annule'),
    ]).then(([{ data: fraisData }, { data: rdvData }]) => {
      setFrais((fraisData as FraisEntry[]) ?? []);
      // Compute per-month stats from rdv
      const byMonth: Record<number, { visits: Set<string>; patients: Set<string> }> = {};
      for (let m = 1; m <= 12; m++) byMonth[m] = { visits: new Set(), patients: new Set() };
      (rdvData ?? []).forEach((r: { date: string; patient_id: string | null }) => {
        const m = parseInt(r.date.split('-')[1]);
        byMonth[m].visits.add(r.date + '-' + Math.random());
        if (r.patient_id) byMonth[m].patients.add(r.patient_id);
      });
      setRdvStats(Object.entries(byMonth).map(([m, v]) => ({
        mois: parseInt(m), nb_visites: v.visits.size, nb_patients: v.patients.size,
      })));
      setLoading(false);
    });
  }, [user, selectedYear]);

  const totalKm      = frais.reduce((s, f) => s + f.km_parcourus, 0);
  const totalMontant = frais.reduce((s, f) => s + f.montant_total, 0);
  const totalVisites = rdvStats.reduce((s, r) => s + r.nb_visites, 0);
  const moisSaisis   = frais.length;
  const isComplete   = moisSaisis === 12;

  const handlePrint = () => window.print();

  const years = Array.from({ length: new Date().getFullYear() - 2022 + 1 }, (_, i) => 2022 + i);

  return (
    <AppShell>
      <Topbar title="Rapport fiscal" subtitle="Indemnités kilométriques annuelles" />
      <div style={{ flex:1, background:'#F8FAFC', overflow:'auto' }}>

        {/* ── Config panel (screen only) ── */}
        <div className="no-print" style={{ padding:'24px 32px', borderBottom:'1px solid #E2E8F0', background:'#fff' }}>
          <div style={{ maxWidth:'900px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', alignItems:'end' }}>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Année fiscale</label>
              <select value={selectedYear} onChange={e => setYear(Number(e.target.value))}
                style={{ width:'100%', padding:'10px 14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', color:'#0F172A', outline:'none' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Votre nom complet</label>
              <input style={{ width:'100%', padding:'10px 14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', color:'#0F172A', outline:'none', boxSizing:'border-box' }}
                placeholder="Dr Dupont Marie" value={nomPro} onChange={e => setNomPro(e.target.value)} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Profession</label>
              <input style={{ width:'100%', padding:'10px 14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', color:'#0F172A', outline:'none', boxSizing:'border-box' }}
                placeholder="Ex : Infirmier libéral, Kiné, VRP, Technicien…" value={profession} onChange={e => setProfession(e.target.value)} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>N° SIRET (optionnel)</label>
              <input style={{ width:'100%', padding:'10px 14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', color:'#0F172A', outline:'none', boxSizing:'border-box' }}
                placeholder="123 456 789 00012" value={siret} onChange={e => setSiret(e.target.value)} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Adresse professionnelle</label>
              <input style={{ width:'100%', padding:'10px 14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', color:'#0F172A', outline:'none', boxSizing:'border-box' }}
                placeholder="15 rue de la Paix, 83600 Fréjus" value={adressePro} onChange={e => setAdressePro(e.target.value)} />
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={handlePrint}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'11px 16px', background:'#2563EB', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer', boxShadow:'0 4px 12px rgba(37,99,235,0.25)' }}>
                <Printer style={{ width:'16px', height:'16px' }} /> Imprimer / PDF
              </button>
            </div>
          </div>

          {/* Completeness warning */}
          {!loading && !isComplete && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'16px', padding:'12px 16px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'10px' }}>
              <AlertCircle style={{ width:'16px', height:'16px', color:'#D97706', flexShrink:0 }} />
              <p style={{ fontSize:'13px', color:'#92400E' }}>
                {12 - moisSaisis} mois sans données kilométriques — le rapport sera incomplet.
                <Link href="/frais" style={{ color:'#2563EB', fontWeight:600, marginLeft:'8px' }}>Compléter les frais →</Link>
              </p>
            </div>
          )}
          {!loading && isComplete && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'16px', padding:'12px 16px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'10px' }}>
              <CheckCircle2 style={{ width:'16px', height:'16px', color:'#10B981', flexShrink:0 }} />
              <p style={{ fontSize:'13px', color:'#065F46' }}>Données complètes pour {selectedYear} — rapport prêt à générer.</p>
            </div>
          )}
        </div>

        {/* ── Printable rapport ── */}
        <div ref={printRef} className="rapport-print" style={{ maxWidth:'900px', margin:'32px auto', padding:'0 32px 32px' }}>

          {/* En-tête */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingBottom:'24px', borderBottom:'2px solid #0F172A', marginBottom:'32px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <div style={{ width:'36px', height:'36px', background:'#2563EB', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/></svg>
                </div>
                <div>
                  <p style={{ fontSize:'18px', fontWeight:800, color:'#0F172A', letterSpacing:'-0.3px' }}>Itilib</p>
                  <p style={{ fontSize:'11px', color:'#94A3B8' }}>Gestion de tournées professionnelles</p>
                </div>
              </div>
              <p style={{ fontSize:'24px', fontWeight:800, color:'#0F172A', marginBottom:'4px' }}>
                Relevé d'indemnités kilométriques
              </p>
              <p style={{ fontSize:'15px', color:'#64748B' }}>Année fiscale {selectedYear}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:'14px', fontWeight:700, color:'#0F172A' }}>{nomPro || 'Nom du professionnel'}</p>
              <p style={{ fontSize:'13px', color:'#64748B' }}>{profession}</p>
              {siret && <p style={{ fontSize:'12px', color:'#94A3B8', marginTop:'4px' }}>SIRET : {siret}</p>}
              {adressePro && <p style={{ fontSize:'12px', color:'#94A3B8', marginTop:'2px' }}>{adressePro}</p>}
              <p style={{ fontSize:'12px', color:'#94A3B8', marginTop:'4px' }}>
                Document généré le {new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
              </p>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'32px' }}>
            {[
              { label:'Kilomètres totaux', value:`${totalKm.toFixed(1)} km`, color:'#2563EB', bg:'#EFF6FF' },
              { label:'Indemnités totales', value:`${totalMontant.toFixed(2)} €`, color:'#059669', bg:'#F0FDF4' },
              { label:'Visites réalisées', value:`${totalVisites}`, color:'#7C3AED', bg:'#F5F3FF' },
              { label:'Barème appliqué', value:`${BAREME_URSSAF_2024} €/km`, color:'#D97706', bg:'#FFFBEB' },
            ].map(k => (
              <div key={k.label} style={{ padding:'16px 20px', background:k.bg, borderRadius:'12px', border:`1px solid ${k.color}22` }}>
                <p style={{ fontSize:'11px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>{k.label}</p>
                <p style={{ fontSize:'22px', fontWeight:800, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Tableau mensuel */}
          <div style={{ marginBottom:'32px' }}>
            <h2 style={{ fontSize:'16px', fontWeight:700, color:'#0F172A', marginBottom:'16px' }}>Détail mensuel</h2>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ background:'#0F172A' }}>
                  {['Mois','Visites','Patients','Kilom. parcourus','Barème (€/km)','Indemnité (€)','Statut'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#FFFFFF', fontWeight:600, fontSize:'12px', letterSpacing:'0.03em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOIS.map((moisNom, idx) => {
                  const mois = idx + 1;
                  const f = frais.find(e => e.mois === mois);
                  const s = rdvStats.find(r => r.mois === mois);
                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={mois} style={{ background: isEven ? '#F8FAFC' : '#FFFFFF' }}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'#0F172A', borderBottom:'1px solid #F1F5F9' }}>{moisNom}</td>
                      <td style={{ padding:'10px 14px', color:'#374151', borderBottom:'1px solid #F1F5F9' }}>{s?.nb_visites ?? 0}</td>
                      <td style={{ padding:'10px 14px', color:'#374151', borderBottom:'1px solid #F1F5F9' }}>{s?.nb_patients ?? 0}</td>
                      <td style={{ padding:'10px 14px', color:'#374151', borderBottom:'1px solid #F1F5F9' }}>{f ? `${f.km_parcourus.toFixed(1)} km` : <span style={{ color:'#CBD5E1' }}>—</span>}</td>
                      <td style={{ padding:'10px 14px', color:'#374151', borderBottom:'1px solid #F1F5F9' }}>{f ? `${f.bareme.toFixed(3)}` : <span style={{ color:'#CBD5E1' }}>—</span>}</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color: f ? '#059669' : '#CBD5E1', borderBottom:'1px solid #F1F5F9' }}>{f ? `${f.montant_total.toFixed(2)} €` : '—'}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid #F1F5F9' }}>
                        {f ? (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', background:'#F0FDF4', color:'#059669', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>
                            ✓ Saisi
                          </span>
                        ) : (
                          <span style={{ display:'inline-flex', padding:'2px 8px', background:'#FEF2F2', color:'#DC2626', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>
                            Manquant
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:'#0F172A' }}>
                  <td style={{ padding:'12px 14px', fontWeight:700, color:'#FFFFFF', fontSize:'14px' }}>TOTAL ANNUEL</td>
                  <td style={{ padding:'12px 14px', fontWeight:600, color:'#FFFFFF' }}>{totalVisites}</td>
                  <td style={{ padding:'12px 14px', color:'#94A3B8' }}>—</td>
                  <td style={{ padding:'12px 14px', fontWeight:700, color:'#FFFFFF' }}>{totalKm.toFixed(1)} km</td>
                  <td style={{ padding:'12px 14px', color:'#94A3B8' }}>—</td>
                  <td style={{ padding:'12px 14px', fontWeight:800, color:'#34D399', fontSize:'16px' }}>{totalMontant.toFixed(2)} €</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ padding:'2px 10px', background: isComplete ? '#059669' : '#D97706', color:'#fff', borderRadius:'999px', fontSize:'11px', fontWeight:700 }}>
                      {isComplete ? 'Complet' : `${moisSaisis}/12`}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cadre légal */}
          <div style={{ padding:'20px 24px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'12px', marginBottom:'24px' }}>
            <p style={{ fontSize:'13px', fontWeight:700, color:'#0F172A', marginBottom:'8px' }}>📋 Base réglementaire</p>
            <p style={{ fontSize:'12px', color:'#64748B', lineHeight:1.7 }}>
              Les indemnités kilométriques sont calculées conformément au barème kilométrique en vigueur fixé par l'Administration fiscale (BOI-BIC-CHG-40-40-20), applicable à tout professionnel exerçant une activité nécessitant des déplacements (libéraux, salariés en défraiement, VRP, techniciens itinérants, etc.). Barème {selectedYear} : <strong>{BAREME_URSSAF_2024} €/km</strong> (véhicule 5 CV — consultez le barème complet selon votre puissance fiscale). Ce document est établi à partir des données saisies dans Itilib et constitue une synthèse des déplacements professionnels de l'exercice {selectedYear}. Il est recommandé de le soumettre à votre expert-comptable ou service RH pour validation définitive.
            </p>
          </div>

          {/* Signature */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px', marginTop:'32px' }}>
            <div style={{ padding:'20px', border:'1px solid #E2E8F0', borderRadius:'12px' }}>
              <p style={{ fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'32px' }}>Fait à _________________, le {new Date().toLocaleDateString('fr-FR')}</p>
              <p style={{ fontSize:'12px', color:'#94A3B8' }}>Signature du professionnel</p>
              <div style={{ marginTop:'8px', borderBottom:'1px solid #CBD5E1', width:'200px' }} />
            </div>
            <div style={{ padding:'20px', background:'#EFF6FF', border:'1px solid #DBEAFE', borderRadius:'12px' }}>
              <p style={{ fontSize:'12px', fontWeight:700, color:'#1D4ED8', marginBottom:'8px' }}>💡 Conseil</p>
              <p style={{ fontSize:'12px', color:'#1E40AF', lineHeight:1.6 }}>
                Conservez ce document avec vos justificatifs de déplacement (agenda professionnel, carnet de bord) pendant 3 ans. En cas de contrôle fiscal, l'application Itilib conserve l'historique de vos tournées à titre de preuve complémentaire.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop:'40px', paddingTop:'16px', borderTop:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:'11px', color:'#CBD5E1' }}>Généré par Itilib · itilib.fr · Document confidentiel</p>
            <p style={{ fontSize:'11px', color:'#CBD5E1' }}>Exercice fiscal {selectedYear} · Page 1/1</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .rapport-print {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </AppShell>
  );
}
