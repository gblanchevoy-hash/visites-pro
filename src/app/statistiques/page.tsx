'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { formatDuree, distanceHaversine } from '@/lib/utils/geo';
import { exportStatsPDF, exportStatsExcel } from '@/lib/utils/exports';
import { BarChart3, TrendingUp, Car, Clock, Users, Download } from 'lucide-react';
import { StatsMensuelles } from '@/types';

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function StatistiquesPage() {
  const { user, settings } = useAppStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<StatsMensuelles[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      setLoading(true);

      // Load rendez-vous for the year (with patient coords for km estimation)
      const { data: rdvs } = await supabase
        .from('rendez_vous')
        .select('date, duree_minutes, statut, lat, lng, patient:patients(lat, lng)')
        .eq('user_id', user.id)
        .gte('date', `${selectedYear}-01-01`)
        .lte('date', `${selectedYear}-12-31`)
        .neq('statut', 'annule');

      // Load frais (manual entries take priority when present)
      const { data: frais } = await supabase
        .from('frais_kilometriques')
        .select('mois, km_parcourus, montant_total')
        .eq('user_id', user.id)
        .eq('annee', selectedYear);

      const dep = settings?.adresse_depart_lat
        ? { lat: settings.adresse_depart_lat, lng: settings.adresse_depart_lng! }
        : null;

      type RdvRow = { date: string; duree_minutes: number; lat: number | null; lng: number | null; patient: { lat: number | null; lng: number | null } | null };

      // Aggregate by month
      const monthStats: StatsMensuelles[] = MOIS_COURTS.map((mois, idx) => {
        const monthNum = idx + 1;
        const monthStr = monthNum.toString().padStart(2, '0');
        const monthRdvs = ((rdvs ?? []) as unknown as RdvRow[]).filter((r) => r.date.startsWith(`${selectedYear}-${monthStr}`));
        const monthFrais = (frais ?? []).find((f) => f.mois === monthNum);

        // If a manual/auto frais entry exists for this month, use it.
        // Use frais_kilometriques as authoritative km source (same as rapport fiscal)
        let kmTotal = monthFrais?.km_parcourus ?? 0;
        if (!monthFrais) {
          const byDay: Record<string, RdvRow[]> = {};
          monthRdvs.forEach(r => { byDay[r.date] = byDay[r.date] ?? []; byDay[r.date].push(r); });
          Object.values(byDay).forEach(dayRdvs => {
            const coords = dayRdvs
              .map(r => (r.patient?.lat && r.patient?.lng) ? { lat: r.patient.lat, lng: r.patient.lng }
                : (r.lat && r.lng) ? { lat: r.lat, lng: r.lng } : null)
              .filter(Boolean) as { lat: number; lng: number }[];
            if (coords.length === 0) return;
            if (dep) kmTotal += distanceHaversine(dep.lat, dep.lng, coords[0].lat, coords[0].lng);
            for (let i = 0; i < coords.length - 1; i++)
              kmTotal += distanceHaversine(coords[i].lat, coords[i].lng, coords[i+1].lat, coords[i+1].lng);
            if (dep) kmTotal += distanceHaversine(coords[coords.length-1].lat, coords[coords.length-1].lng, dep.lat, dep.lng);
          });
        }

        return {
          mois,
          nb_visites: monthRdvs.length,
          km_total: kmTotal,
          duree_trajet_min: 0,
          duree_soin_min: monthRdvs.reduce((a, r) => a + r.duree_minutes, 0),
          frais_total: monthFrais?.montant_total ?? (kmTotal * (settings?.bareme_km ?? 0.62)),
        };
      });

      setStats(monthStats);
      setLoading(false);
    };

    loadStats();
  }, [user, selectedYear, settings]);

  const totals = stats.reduce((acc, s) => ({
    visites: acc.visites + s.nb_visites,
    km: acc.km + s.km_total,
    soin: acc.soin + s.duree_soin_min,
    frais: acc.frais + s.frais_total,
  }), { visites: 0, km: 0, soin: 0, frais: 0 });

  const maxVisites = Math.max(...stats.map((s) => s.nb_visites), 1);
  const maxKm = Math.max(...stats.map((s) => s.km_total), 1);

  return (
    <AppShell>
      <Topbar
        title="Statistiques"
        subtitle={`Année ${selectedYear}`}
        actions={
          <div className="flex gap-2">
            <select className="input w-auto text-sm" value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {Array.from({ length: new Date().getFullYear() - 2022 + 1 }, (_, i) => 2022 + i).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => exportStatsPDF(stats.filter((s) => s.nb_visites > 0), selectedYear)}
              className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => exportStatsExcel(stats.filter((s) => s.nb_visites > 0), selectedYear)}
              className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        }
      />

      <div style={{ flex:1,padding:"32px",background:"#F8FAFC",overflow:"auto" }}>
        {/* KPI annuels */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Visites totales', value: totals.visites, unit: '', icon: Users, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Kilomètres', value: totals.km.toFixed(0), unit: ' km', icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Temps de soins', value: formatDuree(totals.soin), unit: '', icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Indemnités km', value: totals.frais.toFixed(2), unit: ' €', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, unit, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}<span className="text-sm font-normal text-slate-400">{unit}</span></p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Visites chart */}
          <div style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:"16px",boxShadow:"0 4px 12px rgba(15,23,42,0.04)",padding:"20px" }}>
            <h2 className="font-semibold text-slate-900 mb-4">Visites par mois</h2>
            <div className="flex items-end gap-1 h-40">
              {stats.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-primary-600">{s.nb_visites > 0 ? s.nb_visites : ''}</span>
                  <div className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                    style={{ height: `${(s.nb_visites / maxVisites) * 120}px`, minHeight: s.nb_visites > 0 ? '4px' : '0' }}
                    title={`${s.mois}: ${s.nb_visites} visite(s)`} />
                  <span className="text-[9px] text-slate-400">{s.mois}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Km chart */}
          <div style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:"16px",boxShadow:"0 4px 12px rgba(15,23,42,0.04)",padding:"20px" }}>
            <h2 className="font-semibold text-slate-900 mb-4">Kilométrage par mois</h2>
            <div className="flex items-end gap-1 h-40">
              {stats.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-emerald-600">{s.km_total > 0 ? Math.round(s.km_total) : ''}</span>
                  <div className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                    style={{ height: `${(s.km_total / maxKm) * 120}px`, minHeight: s.km_total > 0 ? '4px' : '0' }} />
                  <span className="text-[9px] text-slate-400">{s.mois}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tableau détaillé */}
        <div style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:"16px",boxShadow:"0 4px 12px rgba(15,23,42,0.04)",overflow:"hidden",marginBottom:"16px" }}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Tableau mensuel détaillé</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-medium text-slate-500">Mois</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-500">Visites</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-500">Kilométrage</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-500">Temps soins</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-500">Indemnités</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 ${s.nb_visites === 0 ? 'opacity-40' : ''}`}>
                    <td className="px-5 py-3 font-medium text-slate-700">{s.mois} {selectedYear}</td>
                    <td className="px-5 py-3 text-right">{s.nb_visites > 0 ? s.nb_visites : '—'}</td>
                    <td className="px-5 py-3 text-right">{s.km_total > 0 ? `${s.km_total.toFixed(1)} km` : '—'}</td>
                    <td className="px-5 py-3 text-right">{s.duree_soin_min > 0 ? formatDuree(s.duree_soin_min) : '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">{s.frais_total > 0 ? `${s.frais_total.toFixed(2)} €` : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                  <td className="px-5 py-3 text-slate-900">Totaux {selectedYear}</td>
                  <td className="px-5 py-3 text-right text-slate-900">{totals.visites}</td>
                  <td className="px-5 py-3 text-right text-slate-900">{totals.km.toFixed(1)} km</td>
                  <td className="px-5 py-3 text-right text-slate-900">{formatDuree(totals.soin)}</td>
                  <td className="px-5 py-3 text-right text-emerald-700 text-base">{totals.frais.toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
