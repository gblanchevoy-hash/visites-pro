'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { toISODate } from '@/lib/utils/dates';
import { exportTourneePDF, exportTourneeExcel, exportStatsPDF, exportStatsExcel } from '@/lib/utils/exports';
import { RendezVous, StatsMensuelles } from '@/types';
import { FileText, Download, Calendar, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function ExportsPage() {
  const { user, settings } = useAppStore();
  const [exportDate, setExportDate] = useState(toISODate(new Date()));
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState('');

  const loadRdvsForDate = async (date: string): Promise<RendezVous[]> => {
    const { data } = await supabase
      .from('rendez_vous')
      .select('*, patient:patients(*)')
      .eq('user_id', user!.id)
      .eq('date', date)
      .neq('statut', 'annule')
      .order('heure_debut');
    return (data as unknown as RendezVous[]) ?? [];
  };

  const loadStatsForYear = async (year: number): Promise<StatsMensuelles[]> => {
    const { data: rdvs } = await supabase
      .from('rendez_vous')
      .select('date, duree_minutes')
      .eq('user_id', user!.id)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .neq('statut', 'annule');

    const { data: frais } = await supabase
      .from('frais_kilometriques')
      .select('mois, km_parcourus, montant_total')
      .eq('user_id', user!.id)
      .eq('annee', year);

    return MOIS_NOMS.map((mois, idx) => {
      const monthNum = idx + 1;
      const monthStr = monthNum.toString().padStart(2, '0');
      const monthRdvs = (rdvs ?? []).filter((r) => r.date.startsWith(`${year}-${monthStr}`));
      const monthFrais = (frais ?? []).find((f) => f.mois === monthNum);
      return {
        mois,
        nb_visites: monthRdvs.length,
        km_total: monthFrais?.km_parcourus ?? 0,
        duree_trajet_min: 0,
        duree_soin_min: monthRdvs.reduce((a, r) => a + r.duree_minutes, 0),
        frais_total: monthFrais?.montant_total ?? 0,
      };
    }).filter((s) => s.nb_visites > 0);
  };

  const exportActions = [
    {
      id: 'tournee-pdf',
      icon: FileText,
      title: 'Feuille de tournée (PDF)',
      desc: 'Liste complète des visites du jour avec heures, adresses et téléphones',
      color: 'text-red-600 bg-red-50',
      action: async () => {
        setLoading('tournee-pdf');
        const rdvs = await loadRdvsForDate(exportDate);
        if (!rdvs.length) { toast.error('Aucune visite ce jour'); setLoading(''); return; }
        await exportTourneePDF(rdvs, new Date(exportDate), 0, 0);
        toast.success('PDF généré');
        setLoading('');
      },
    },
    {
      id: 'tournee-excel',
      icon: Download,
      title: 'Feuille de tournée (Excel)',
      desc: 'Données de la tournée dans un tableau Excel modifiable',
      color: 'text-emerald-600 bg-emerald-50',
      action: async () => {
        setLoading('tournee-excel');
        const rdvs = await loadRdvsForDate(exportDate);
        if (!rdvs.length) { toast.error('Aucune visite ce jour'); setLoading(''); return; }
        await exportTourneeExcel(rdvs, new Date(exportDate));
        setLoading('');
      },
    },
    {
      id: 'stats-pdf',
      icon: BarChart3,
      title: 'Rapport annuel (PDF)',
      desc: 'Statistiques complètes par mois : visites, km, temps, indemnités',
      color: 'text-violet-600 bg-violet-50',
      action: async () => {
        setLoading('stats-pdf');
        const stats = await loadStatsForYear(exportYear);
        if (!stats.length) { toast.error('Aucune donnée pour cette année'); setLoading(''); return; }
        await exportStatsPDF(stats, exportYear);
        setLoading('');
      },
    },
    {
      id: 'stats-excel',
      icon: Calendar,
      title: 'Rapport annuel (Excel)',
      desc: 'Données annuelles exportées dans un classeur Excel',
      color: 'text-amber-600 bg-amber-50',
      action: async () => {
        setLoading('stats-excel');
        const stats = await loadStatsForYear(exportYear);
        await exportStatsExcel(stats, exportYear);
        setLoading('');
      },
    },
  ];

  return (
    <AppShell>
      <Topbar title="Exports" subtitle="Générez vos rapports et feuilles de tournée" />

      <div className="flex-1 p-4 lg:p-6 space-y-6 max-w-2xl">
        {/* Date selector */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Paramètres d'export</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date pour les tournées</label>
              <input type="date" className="input" value={exportDate}
                onChange={(e) => setExportDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Année pour les rapports</label>
              <select className="input" value={exportYear}
                onChange={(e) => setExportYear(Number(e.target.value))}>
                {[2022, 2023, 2024, 2025].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Export cards */}
        <div className="space-y-3">
          {exportActions.map((action) => {
            const Icon = action.icon;
            return (
              <div key={action.id} className="card p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{action.title}</p>
                  <p className="text-sm text-slate-500">{action.desc}</p>
                </div>
                <button
                  onClick={action.action}
                  disabled={loading === action.id}
                  className="btn-primary shrink-0">
                  {loading === action.id ? 'Génération…' : 'Exporter'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Print tip */}
        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
          <p className="font-medium mb-1">💡 Impression directe</p>
          <p>Pour imprimer une tournée, ouvrez la page <strong>Tournées</strong> et utilisez le bouton 🖨️ ou Ctrl+P.</p>
        </div>
      </div>
    </AppShell>
  );
}
