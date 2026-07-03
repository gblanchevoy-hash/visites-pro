'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Plus, Download, Trash2, Calculator, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { distanceHaversine } from '@/lib/utils/geo';
import { RendezVous } from '@/types';

interface FraisEntry {
  id: string; mois: number; annee: number;
  km_parcourus: number; bareme: number; montant_total: number; created_at: string;
}

const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function FraisPage() {
  const { user, settings } = useAppStore();
  const [entries, setEntries]       = useState<FraisEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editMois, setEditMois]     = useState<number | null>(null);
  const [editKm, setEditKm]         = useState('');
  const [editBareme, setEditBareme] = useState('0.60');
  const [loading, setLoading]       = useState(false);
  const [computing, setComputing]   = useState<number | null>(null); // mois en cours de calcul

  const loadEntries = async () => {
    if (!user) return;
    const { data } = await supabase.from('frais_kilometriques').select('*')
      .eq('user_id', user.id).eq('annee', selectedYear).order('mois');
    setEntries((data as FraisEntry[]) ?? []);
  };

  useEffect(() => { loadEntries(); }, [user, selectedYear]);

  const totalAnnee = entries.reduce((a, e) => a + e.montant_total, 0);
  const totalKm    = entries.reduce((a, e) => a + e.km_parcourus, 0);

  const openEdit = (mois: number) => {
    const existing = entries.find(e => e.mois === mois);
    setEditMois(mois);
    setEditKm(existing ? existing.km_parcourus.toString() : '');
    setEditBareme(existing ? existing.bareme.toString() : (settings?.bareme_km?.toString() ?? '0.60'));
  };

  // Auto-calculate km from RDVs for a given month
  const autoCalculer = async (mois: number) => {
    if (!user) return;
    setComputing(mois);
    const yearMonth = `${selectedYear}-${String(mois).padStart(2,'0')}`;
    const { data } = await supabase
      .from('rendez_vous').select('*, patient:patients(*)')
      .eq('user_id', user.id)
      .gte('date', `${yearMonth}-01`)
      .lte('date', `${yearMonth}-31`)
      .neq('statut', 'annule')
      .order('date').order('heure_debut');
    const rdvs = (data as unknown as RendezVous[]) ?? [];

    let kmTotal = 0;
    const dep = settings?.adresse_depart_lat
      ? { lat: settings.adresse_depart_lat, lng: settings.adresse_depart_lng! }
      : null;

    // Group by day and compute distances
    const byDay: Record<string, RendezVous[]> = {};
    rdvs.forEach(r => { byDay[r.date] = byDay[r.date] ?? []; byDay[r.date].push(r); });

    Object.values(byDay).forEach(dayRdvs => {
      const coords = dayRdvs
        .map(r => r.patient?.lat && r.patient?.lng ? { lat: r.patient.lat, lng: r.patient.lng }
          : r.lat && r.lng ? { lat: r.lat, lng: r.lng } : null)
        .filter(Boolean) as { lat: number; lng: number }[];
      if (coords.length === 0) return;

      // depart → first
      if (dep) kmTotal += distanceHaversine(dep.lat, dep.lng, coords[0].lat, coords[0].lng);
      // between visits
      for (let i = 0; i < coords.length - 1; i++)
        kmTotal += distanceHaversine(coords[i].lat, coords[i].lng, coords[i+1].lat, coords[i+1].lng);
      // last → retour
      if (dep) kmTotal += distanceHaversine(coords[coords.length-1].lat, coords[coords.length-1].lng, dep.lat, dep.lng);
    });

    setEditMois(mois);
    setEditKm(kmTotal.toFixed(1));
    setEditBareme(settings?.bareme_km?.toString() ?? '0.60');
    setComputing(null);
    if (kmTotal === 0) toast('Aucune visite géolocalisée ce mois', { icon: '⚠️' });
    else toast.success(`${kmTotal.toFixed(1)} km calculés automatiquement`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || editMois === null) return;
    setLoading(true);
    const km = parseFloat(editKm);
    const bareme = parseFloat(editBareme);
    const montant = Math.round(km * bareme * 100) / 100;
    const existing = entries.find(e => e.mois === editMois);

    if (existing) {
      const { data, error } = await supabase.from('frais_kilometriques')
        .update({ km_parcourus: km, bareme, montant_total: montant })
        .eq('id', existing.id).select().single();
      if (error) { toast.error('Erreur'); setLoading(false); return; }
      setEntries(prev => prev.map(e => e.id === existing.id ? data as FraisEntry : e));
    } else {
      const { data, error } = await supabase.from('frais_kilometriques').insert({
        user_id: user.id, mois: editMois, annee: selectedYear, km_parcourus: km, bareme, montant_total: montant,
      }).select().single();
      if (error) { toast.error('Erreur'); setLoading(false); return; }
      setEntries(prev => [...prev, data as FraisEntry].sort((a,b) => a.mois - b.mois));
    }
    toast.success('Enregistré !');
    setEditMois(null); setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    await supabase.from('frais_kilometriques').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entrée supprimée');
  };

  return (
    <AppShell>
      <Topbar title="Frais kilométriques"
        subtitle={`Barème : ${settings?.bareme_km?.toFixed(2) ?? '0.60'} €/km`}
        actions={
          <select className="input w-auto text-sm py-1.5" value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}>
            {Array.from({ length: new Date().getFullYear() - 2022 + 1 }, (_, i) => 2022 + i)
              .map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      />

      <div style={{ flex:1,padding:"32px",background:"#F8FAFC",overflow:"auto" }}>
        {/* KPI */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"16px",marginBottom:"16px" }}>
          <div style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:"16px",boxShadow:"0 4px 12px rgba(15,23,42,0.04)",padding:"20px" }}>
            <p style={{ fontSize:"11px",fontWeight:600,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em" }}>Total km {selectedYear}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalKm.toFixed(0)} <span className="text-base font-normal text-slate-400">km</span></p>
          </div>
          <div style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:"16px",boxShadow:"0 4px 12px rgba(15,23,42,0.04)",padding:"20px" }}>
            <p style={{ fontSize:"11px",fontWeight:600,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em" }}>Indemnités {selectedYear}</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{totalAnnee.toFixed(2)} <span className="text-base font-normal text-emerald-400">€</span></p>
          </div>
          <div style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:"16px",boxShadow:"0 4px 12px rgba(15,23,42,0.04)",padding:"20px" }}>
            <p style={{ fontSize:"11px",fontWeight:600,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em" }}>Mois saisis</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{entries.length} <span className="text-base font-normal text-slate-400">/ 12</span></p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${(entries.length/12)*100}%` }} />
            </div>
          </div>
        </div>

        {/* Edit form */}
        {editMois !== null && (
          <div style={{ background:"#EFF6FF",border:"1.5px solid #DBEAFE",borderRadius:"16px",padding:"20px",marginBottom:"16px" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">{MOIS_NOMS[editMois-1]} {selectedYear}</h3>
              <button onClick={() => setEditMois(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕ Fermer</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display:"block",fontSize:"12px",fontWeight:600,color:"#374151",marginBottom:"6px" }}>Kilomètres parcourus</label>
                  <input type="number" step="0.1" style={{ width:"100%",padding:"11px 14px",background:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:"10px",fontSize:"14px",color:"#0F172A",outline:"none",fontFamily:"inherit",boxSizing:"border-box" as "border-box" }} required placeholder="ex: 1250.5"
                    value={editKm} onChange={e => setEditKm(e.target.value)} />
                </div>
                <div>
                  <label style={{ display:"block",fontSize:"12px",fontWeight:600,color:"#374151",marginBottom:"6px" }}>Barème (€/km)</label>
                  <input type="number" step="0.001" style={{ width:"100%",padding:"11px 14px",background:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:"10px",fontSize:"14px",color:"#0F172A",outline:"none",fontFamily:"inherit",boxSizing:"border-box" as "border-box" }} required
                    value={editBareme} onChange={e => setEditBareme(e.target.value)} />
                </div>
              </div>
              {editKm && editBareme && (
                <div style={{ padding:"12px 14px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:"10px",fontSize:"13px",color:"#065F46",fontWeight:600 }}>
                  Indemnité estimée : {(parseFloat(editKm||'0') * parseFloat(editBareme||'0')).toFixed(2)} €
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditMois(null)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"10px 20px",background:"#F8FAFC",color:"#374151",border:"1.5px solid #E2E8F0",borderRadius:"10px",fontSize:"14px",fontWeight:500,cursor:"pointer" }}>Annuler</button>
                <button type="submit" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"10px 20px",background:"#2563EB",color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:600,cursor:"pointer" }} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : <><CheckCircle2 className="w-4 h-4" /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Monthly table */}
        <div style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:"16px",boxShadow:"0 4px 12px rgba(15,23,42,0.04)",overflow:"hidden",marginBottom:"16px" }}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Détail mensuel {selectedYear}</h2>
            <p className="text-xs text-slate-400">Cliquez sur un mois pour saisir ou modifier · 🔄 pour calculer automatiquement depuis vos tournées</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium text-slate-500">Mois</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500">Kilomètres</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500">Barème</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500">Indemnité</th>
                <th className="px-5 py-3 text-center font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOIS_NOMS.map((moisNom, idx) => {
                const mois = idx + 1;
                const entry = entries.find(e => e.mois === mois);
                const isEditing = editMois === mois;
                const isComputing = computing === mois;
                return (
                  <tr key={idx} className={`border-b border-slate-50 transition-colors ${isEditing ? 'bg-primary-50/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-5 py-3">
                      <button onClick={() => openEdit(mois)} className="font-medium text-slate-700 hover:text-primary-600 transition-colors text-left">
                        {moisNom}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{entry ? `${entry.km_parcourus.toFixed(1)} km` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{entry ? `${entry.bareme.toFixed(3)} €` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">{entry ? `${entry.montant_total.toFixed(2)} €` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(mois)} title="Saisie manuelle"
                          className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => autoCalculer(mois)} disabled={isComputing} title="Calculer depuis les tournées"
                          className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50">
                          {isComputing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        </button>
                        {entry && (
                          <button onClick={() => handleDelete(entry.id)} title="Supprimer"
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <td className="px-5 py-3 text-slate-900">Total annuel</td>
                <td className="px-5 py-3 text-right text-slate-900">{totalKm.toFixed(1)} km</td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-right text-emerald-700 text-base">{totalAnnee.toFixed(2)} €</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding:"14px 16px",background:"#EFF6FF",border:"1px solid #DBEAFE",borderRadius:"12px",fontSize:"12px",color:"#1D4ED8",lineHeight:1.6 }}>
          💡 <strong>Calcul automatique</strong> : cliquez sur 🔄 à côté d'un mois pour calculer les km directement depuis vos tournées planifiées. Les adresses doivent être géolocalisées pour que le calcul fonctionne.
        </div>
      </div>
    </AppShell>
  );
}
