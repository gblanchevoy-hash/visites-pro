'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { toISODate, formatDateLong } from '@/lib/utils/dates';
import { RendezVous } from '@/types';
import Link from 'next/link';
import { MapPin, Users, Navigation, Clock, ChevronRight, Calendar, TrendingUp, Shield, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { user, patients, settings } = useAppStore();
  const [todayRdvs, setTodayRdvs] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  useEffect(() => {
    const loadToday = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('rendez_vous')
        .select('*, patient:patients(*)')
        .eq('user_id', user.id)
        .eq('date', toISODate(today))
        .neq('statut', 'annule')
        .order('heure_debut');
      setTodayRdvs((data as unknown as RendezVous[]) ?? []);
      setLoading(false);
    };
    loadToday();
  }, [user]);

  const effectues = todayRdvs.filter((r) => r.statut === 'effectue').length;
  const aVenir = todayRdvs.filter((r) => r.statut === 'planifie').length;
  const isConfigured = !!settings?.adresse_depart_lat && !!settings?.ors_api_key;

  return (
    <AppShell>
      {/* Hero header */}
      <div className="topbar-gradient px-5 py-6 relative overflow-hidden">
        {/* Decorative road dots */}
        <div className="absolute inset-0 road-dots pointer-events-none" style={{ opacity: 0.08 }} />
        {/* Animated road line SVG */}
        <svg className="absolute right-0 top-0 h-full opacity-10" width="200" viewBox="0 0 200 100" preserveAspectRatio="none">
          <path d="M200 0 Q150 50 200 100" stroke="white" strokeWidth="3" fill="none" strokeDasharray="8 6" />
          <path d="M180 0 Q130 50 180 100" stroke="white" strokeWidth="1.5" fill="none" strokeDasharray="4 8" />
        </svg>

        <div className="relative">
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">{formatDateLong(today)}</p>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Bonjour {settings?.pseudonyme ?? user?.email?.split('@')[0] ?? ''} !
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            {todayRdvs.length === 0 ? 'Aucune visite planifiée aujourd\'hui'
              : `${todayRdvs.length} visite${todayRdvs.length > 1 ? 's' : ''} aujourd'hui`}
          </p>
        </div>

        {/* KPI chips */}
        <div className="flex gap-3 mt-4 relative">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <Clock className="w-4 h-4 text-blue-200" />
            <span className="text-white text-sm font-semibold">{aVenir} à venir</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <TrendingUp className="w-4 h-4 text-emerald-300" />
            <span className="text-white text-sm font-semibold">{effectues} effectuées</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <Users className="w-4 h-4 text-violet-300" />
            <span className="text-white text-sm font-semibold">{patients.length} patients</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 lg:p-5 space-y-4 overflow-auto">
        {/* Config alert */}
        {!isConfigured && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Configuration requise</p>
              <p className="text-xs text-amber-700 mt-0.5">Configurez votre point de départ pour activer le calcul d'itinéraires.</p>
            </div>
            <Link href="/depart" className="btn-road text-xs px-3 py-1.5 flex-shrink-0">Configurer</Link>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/tournees', icon: Navigation, label: 'Ma tournée', sub: 'du jour', color: 'from-primary-600 to-primary-500', glow: 'hover:shadow-glow-blue' },
            { href: '/planning', icon: Calendar, label: 'Planning', sub: 'semaine', color: 'from-violet-600 to-violet-500', glow: '' },
            { href: '/patients', icon: Users, label: 'Patients', sub: `${patients.length} enregistrés`, color: 'from-emerald-600 to-emerald-500', glow: '' },
            { href: '/depart', icon: MapPin, label: 'Mon départ', sub: isConfigured ? 'Configuré ✓' : 'À configurer', color: 'from-road-500 to-road-400', glow: 'hover:shadow-glow-road' },
          ].map(({ href, icon: Icon, label, sub, color, glow }) => (
            <Link key={href} href={href}
              className={`card-hover p-4 flex flex-col gap-3 group ${glow}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Today's visits */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" />
              Visites d'aujourd'hui
            </h2>
            <Link href="/tournees" className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Voir tournée <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-6 flex justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
            </div>
          ) : todayRdvs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Aucune visite planifiée</p>
              <Link href="/planning" className="text-xs text-primary-600 font-medium mt-2 inline-block">
                + Planifier une visite
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {todayRdvs.map((rdv, i) => {
                const isOccasionnel = !rdv.patient_id;
                const nomAffiche = isOccasionnel
                  ? rdv.notes?.match(/\[Occasionnel\] ([^\n·]+)/)?.[1]?.trim() ?? 'Passage rapide'
                  : `${rdv.patient?.prenom} ${rdv.patient?.nom}`;
                const statutColors: Record<string, string> = {
                  planifie: 'bg-blue-100 text-blue-700',
                  effectue: 'bg-emerald-100 text-emerald-700',
                  reporte: 'bg-amber-100 text-amber-700',
                  annule: 'bg-red-100 text-red-700',
                };
                return (
                  <div key={rdv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`pin text-xs w-7 h-7 ${i % 3 === 0 ? '' : i % 3 === 1 ? 'pin-green' : 'pin-road'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{nomAffiche}</p>
                      <p className="text-xs text-slate-500">{rdv.heure_debut} — {rdv.heure_fin}
                        {rdv.patient?.ville ? ` · ${rdv.patient.ville}` : ''}
                      </p>
                    </div>
                    <span className={`badge text-[10px] ${statutColors[rdv.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                      {rdv.statut}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security info */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <Shield className="w-5 h-5 text-forest-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-700">Données sécurisées</p>
            <p className="text-[11px] text-slate-500">Vos données patients sont chiffrées et isolées — seul votre compte y a accès.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
