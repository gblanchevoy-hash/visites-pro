'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { RendezVous } from '@/types';
import { toISODate, formatDate, getWeekDays, addDays, addMinutes } from '@/lib/utils/dates';
import { calculerItineraire, calculerSegment, optimiserTournee, formatDuree, calculateFraisKm, distanceHaversine } from '@/lib/utils/geo';
import { exportTourneePDF, exportTourneeExcel } from '@/lib/utils/exports';
import toast from 'react-hot-toast';
import { MapPin, Zap, Navigation, FileText, Download, ChevronLeft, ChevronRight, Home, Flag, Car, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TourneeMap = dynamic(() => import('@/components/map/TourneeMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-2xl">
      <p className="text-slate-400 text-sm">Chargement de la carte…</p>
    </div>
  ),
});

const MiniMapPicker = dynamic(() => import('@/components/ui/MiniMapPicker'), { ssr: false });

interface Segment { km: number; min: number; }
const PIN_COLORS = ['#2563eb','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2','#be185d','#ca8a04'];

function getRdvLabel(rdv: RendezVous) {
  if (rdv.patient) return `${rdv.patient.prenom ?? ''} ${rdv.patient.nom ?? ''}`.trim();
  const notes = rdv.notes ?? '';
  if (notes.startsWith('[Occasionnel]'))
    return notes.replace('[Occasionnel] ','').split(' · ')[0].split('\n')[0].trim();
  return 'Passage rapide';
}

function getRdvCoords(rdv: RendezVous) {
  if (rdv.patient?.lat && rdv.patient?.lng) return { lat: rdv.patient.lat, lng: rdv.patient.lng };
  if (rdv.lat && rdv.lng) return { lat: rdv.lat, lng: rdv.lng };
  return null;
}

export default function TourneesPage() {
  const { settings, user, updatePatient, pushHistory } = useAppStore();
  const [weekStart, setWeekStart] = useState(() => getWeekDays(new Date())[0]);
  const weekDays = getWeekDays(weekStart);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [allRdvs, setAllRdvs] = useState<RendezVous[]>([]);
  const [segments, setSegments] = useState<(Segment | null)[]>([]);
  const [routeGeo, setRouteGeo] = useState<GeoJSON.LineString | null>(null);
  const [computing, setComputing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [activeSegments, setActiveSegments] = useState<boolean[]>([]);

  const [manualOrder, setManualOrder] = useState<string[] | null>(null); // RDV ids in custom order, set by "Optimiser"

  const orderedRdvs = (() => {
    const dayRdvs = allRdvs.filter(r => r.date === toISODate(selectedDay));
    if (manualOrder) {
      const byId = new Map(dayRdvs.map(r => [r.id, r]));
      const ordered = manualOrder.map(id => byId.get(id)).filter(Boolean) as RendezVous[];
      // Include any RDV not in manualOrder (e.g. newly added) at the end, sorted by time
      const remaining = dayRdvs.filter(r => !manualOrder.includes(r.id))
        .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
      return [...ordered, ...remaining];
    }
    return dayRdvs.sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
  })();

  const loadWeek = async () => {
    if (!user) return;
    const start = toISODate(weekDays[0]);
    const end   = toISODate(weekDays[6]);
    const { data } = await supabase
      .from('rendez_vous').select('*, patient:patients(*)')
      .eq('user_id', user.id)
      .gte('date', start).lte('date', end)
      .neq('statut', 'annule').order('date').order('heure_debut');
    setAllRdvs((data as unknown as RendezVous[]) ?? []);
    setSegments([]); setRouteGeo(null); setActiveSegments([]); setManualOrder(null);
  };

  useEffect(() => { loadWeek(); }, [weekStart, user]);
  useEffect(() => { setSegments([]); setRouteGeo(null); setActiveSegments([]); setManualOrder(null); }, [selectedDay]);

  const hasDepart = !!settings?.adresse_depart_lat;
  const depart = hasDepart ? { lat: settings!.adresse_depart_lat!, lng: settings!.adresse_depart_lng! } : null;

  const calculer = async () => {
    const withCoords = orderedRdvs.filter(r => getRdvCoords(r));
    if (withCoords.length < 1) { toast.error('Aucune visite géolocalisée'); return; }
    setComputing(true);
    const sequence: Array<{ lat: number; lng: number; id: string }> = [];
    if (depart) sequence.push({ ...depart, id: 'depart' });
    withCoords.forEach(r => { const c = getRdvCoords(r)!; sequence.push({ ...c, id: r.id }); });
    if (depart) sequence.push({ ...depart, id: 'retour' });
    const segs: (Segment | null)[] = [];
    for (let i = 0; i < sequence.length - 1; i++) {
      await new Promise(r => setTimeout(r, 250));
      const res = await calculerSegment(sequence[i], sequence[i+1], settings?.ors_api_key ?? undefined, user?.id);
      segs.push(res ? { km: res.distance_km, min: res.duree_min } : null);
    }
    setSegments(segs);
    setActiveSegments(Array(segs.length).fill(true));
    const pts = sequence.map(s => ({ lat: s.lat, lng: s.lng }));
    if (pts.length >= 2) {
      const result = await calculerItineraire(pts, settings?.ors_api_key ?? undefined, user?.id);
      if (result) setRouteGeo(result.geometry);
    }
    setComputing(false);
    toast.success('Itinéraire calculé !');
  };

  // Save adjusted GPS coords back to the right table (patient or RDV occasionnel)
  const handleCoordsUpdated = async (rdv: RendezVous, lat: number, lng: number) => {
    if (rdv.patient_id) {
      const { error } = await supabase.from('patients').update({ lat, lng }).eq('id', rdv.patient_id);
      if (error) { toast.error('Erreur sauvegarde position'); return; }
      setAllRdvs(prev => prev.map(r => r.patient_id === rdv.patient_id && r.patient
        ? { ...r, patient: { ...r.patient, lat, lng } } : r));
      // Keep the global patients store in sync (used by the Patients page)
      const updatedPatient = allRdvs.find(r => r.patient_id === rdv.patient_id)?.patient;
      if (updatedPatient) updatePatient({ ...updatedPatient, lat, lng });
    } else {
      const { error } = await supabase.from('rendez_vous').update({ lat, lng }).eq('id', rdv.id);
      if (error) { toast.error('Erreur sauvegarde position'); return; }
      setAllRdvs(prev => prev.map(r => r.id === rdv.id ? { ...r, lat, lng } : r));
    }
    setSegments([]); setRouteGeo(null); setActiveSegments([]);
    toast.success('Position mise à jour');
  };

  const optimiser = async () => {
    if (!depart) { toast.error('Configurez votre adresse de départ'); return; }
    const withCoords = orderedRdvs.filter(r => getRdvCoords(r));
    if (withCoords.length < 2) { toast('Au moins 2 visites géolocalisées sont nécessaires', { icon: 'ℹ️' }); return; }
    setOptimizing(true);

    const enriched = orderedRdvs.map(r => ({ ...r, lat: getRdvCoords(r)?.lat ?? undefined, lng: getRdvCoords(r)?.lng ?? undefined }));
    const optimisedOrder = optimiserTournee(enriched, depart) as unknown as RendezVous[];

    // Reassign sequential time slots in the new order, preserving each visit's own duration
    // and starting from the day's configured start time (or the earliest current heure_debut).
    const dayStart = settings?.heure_debut_journee ?? orderedRdvs[0]?.heure_debut ?? '08:00';
    let cursor = dayStart;
    const before = optimisedOrder.map(r => orderedRdvs.find(o => o.id === r.id)!).filter(Boolean);
    const after: RendezVous[] = [];
    for (const rdv of optimisedOrder) {
      const heure_debut = cursor;
      const heure_fin = addMinutes(cursor, rdv.duree_minutes);
      after.push({ ...rdv, heure_debut, heure_fin });
      cursor = heure_fin;
    }

    // Persist new times to Supabase
    try {
      await Promise.all(after.map(r =>
        supabase.from('rendez_vous').update({ heure_debut: r.heure_debut, heure_fin: r.heure_fin }).eq('id', r.id)
      ));
    } catch {
      toast.error('Erreur lors de la sauvegarde des nouveaux horaires');
      setOptimizing(false);
      return;
    }

    setAllRdvs(prev => {
      const byId = new Map(after.map(r => [r.id, r]));
      return prev.map(r => byId.get(r.id) ?? r);
    });
    pushHistory({ type: 'BATCH_REORDER_RDV', before, after, label: `Optimisation tournée du ${formatDate(selectedDay, 'd MMM')}` });
    setManualOrder(after.map(r => r.id));
    setSegments([]); setActiveSegments([]); setOptimizing(false);
    toast.success('Tournée optimisée ! Horaires mis à jour — cliquez "Calculer l\'itinéraire" pour voir les trajets.');
  };

  const totalKm  = segments.reduce((s, seg) => s + (seg?.km ?? 0), 0);
  const totalMin = segments.reduce((s, seg) => s + (seg?.min ?? 0), 0);
  const fraisTotal = calculateFraisKm(totalKm, settings?.bareme_km ?? 0.6);
  const dureSoins  = orderedRdvs.reduce((a, r) => a + r.duree_minutes, 0);

  // Week summary per day
  const weekSummary = weekDays.map(d => {
    const dr = allRdvs.filter(r => r.date === toISODate(d));
    const km = dr.reduce((a, r, i, arr) => {
      if (i === 0) return a;
      const prev = getRdvCoords(arr[i-1]), curr = getRdvCoords(r);
      if (!prev || !curr) return a;
      return a + distanceHaversine(prev.lat, prev.lng, curr.lat, curr.lng);
    }, 0);
    return { date: d, count: dr.length, km };
  });

  // Timeline
  const timelineItems = () => {
    const items: React.ReactNode[] = [];
    if (depart) {
      items.push(
        <div key="depart" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shadow-lg flex-shrink-0">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="font-semibold text-slate-900 text-sm">Départ domicile</p>
            <p className="text-xs text-slate-500 mt-0.5">{settings?.heure_debut_journee ?? '08:00'} · {settings?.adresse_depart}</p>
          </div>
        </div>
      );
      const segIdx = 0;
      items.push(<SegRow key="seg-dep" seg={segments[segIdx] ?? null} color="#1e40af" segIdx={segIdx} active={activeSegments[segIdx] !== false} onToggle={i => setActiveSegments(p => { const n=[...p]; n[i]=!n[i]; return n; })} />);
    }

    orderedRdvs.forEach((rdv, i) => {
      const color = PIN_COLORS[i % PIN_COLORS.length];
      const segAfterIdx = hasDepart ? i + 1 : i;
      const isLast = i === orderedRdvs.length - 1;
      items.push(
        <VisitCard key={rdv.id} rdv={rdv} index={i} color={color}
          onCoordsUpdated={(lat, lng) => handleCoordsUpdated(rdv, lat, lng)} />
      );
      if (!isLast) {
        items.push(<SegRow key={`seg-${rdv.id}`} seg={segments[segAfterIdx] ?? null} color={PIN_COLORS[(i+1) % PIN_COLORS.length]} segIdx={segAfterIdx} active={activeSegments[segAfterIdx] !== false} onToggle={i => setActiveSegments(p => { const n=[...p]; n[i]=!n[i]; return n; })} />);
      }
    });

    if (depart && orderedRdvs.length > 0) {
      const retourIdx = segments.length - 1;
      items.push(<SegRow key="seg-ret" seg={segments[retourIdx] ?? null} color="#1e293b" segIdx={retourIdx} active={activeSegments[retourIdx] !== false} onToggle={i => setActiveSegments(p => { const n=[...p]; n[i]=!n[i]; return n; })} />);
      items.push(
        <div key="retour" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shadow-lg flex-shrink-0"><Flag className="w-5 h-5 text-white" /></div>
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="font-semibold text-slate-900 text-sm">Retour au domicile</p>
            <p className="text-xs text-slate-500 mt-0.5">Fin de journée</p>
          </div>
        </div>
      );
    }
    return items;
  };

  return (
    <AppShell>
      <Topbar title="Tournées" subtitle={`Semaine du ${formatDate(weekDays[0], 'd MMM')} au ${formatDate(weekDays[6], 'd MMM yyyy')}`} actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => { setWeekStart(getWeekDays(new Date())[0]); setSelectedDay(new Date()); }} className="btn-secondary text-xs px-3">Cette semaine</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
      } />

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto">
        {/* Left panel */}
        <div className="lg:w-[440px] flex-shrink-0 flex flex-col bg-slate-50">

          {/* Week selector */}
          <div className="p-3 bg-white border-b border-slate-100">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(d => {
                const isSelected = toISODate(d) === toISODate(selectedDay);
                const count = allRdvs.filter(r => r.date === toISODate(d)).length;
                const isToday = toISODate(d) === toISODate(new Date());
                return (
                  <button key={d.toISOString()} onClick={() => setSelectedDay(d)}
                    className={cn('flex flex-col items-center py-2 px-1 rounded-xl transition-all text-center',
                      isSelected ? 'bg-primary-600 text-white shadow-md' : isToday ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-100 text-slate-600')}>
                    <span className="text-[10px] font-semibold uppercase">{formatDate(d,'EEE').slice(0,3)}</span>
                    <span className="text-base font-bold">{formatDate(d,'d')}</span>
                    {count > 0 && (
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5',
                        isSelected ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700')}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-3 bg-white border-b border-slate-100 flex gap-2 flex-wrap">
            <button onClick={calculer} disabled={computing || orderedRdvs.length === 0} className="btn-primary flex-1 justify-center text-sm">
              <Navigation className="w-4 h-4" /> {computing ? 'Calcul…' : 'Calculer l\'itinéraire'}
            </button>
            <button onClick={optimiser} disabled={optimizing || orderedRdvs.length === 0}
              className="btn-secondary px-3 text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1.5 text-xs" title="Réorganiser dans l'ordre le plus court">
              <Zap className="w-4 h-4" /> Optimiser
            </button>
            <button onClick={() => exportTourneePDF(orderedRdvs, selectedDay, totalKm, fraisTotal)} className="btn-secondary px-3" disabled={orderedRdvs.length === 0}><FileText className="w-4 h-4" /></button>
            <button onClick={() => exportTourneeExcel(orderedRdvs, selectedDay)} className="btn-secondary px-3" disabled={orderedRdvs.length === 0}><Download className="w-4 h-4" /></button>
          </div>

          {/* Timeline or empty */}
          {orderedRdvs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-600">Aucune visite ce jour</p>
              <p className="text-xs text-slate-400">Sélectionnez un autre jour ou planifiez des RDV</p>
            </div>
          ) : (
            <>
              <div className="flex-1 p-4">
                <div className="relative">
                  <div className="absolute left-5 top-6 bottom-6 w-0.5 border-l-2 border-dashed border-slate-300 z-0" />
                  <div className="relative z-10 space-y-0">{timelineItems()}</div>
                </div>
              </div>

              {/* Stats bar */}
              <div className="bg-white border-t border-slate-200 shadow-lg">
                <button onClick={() => setShowStats(s => !s)} className="w-full flex items-center justify-between px-5 py-3 text-xs text-slate-500 hover:bg-slate-50">
                  <span className="font-semibold uppercase tracking-wide">Résumé · {formatDate(selectedDay, 'd MMM')}</span>
                  {showStats ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                {showStats && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                    {[
                      { icon: <Car className="w-4 h-4 text-primary-600" />, bg: 'bg-primary-50', label: 'Total du jour', value: totalKm > 0 ? `${totalKm.toFixed(1)} km` : '— km' },
                      { icon: <Clock className="w-4 h-4 text-road-600" />, bg: 'bg-road-50', label: 'Temps trajet', value: totalMin > 0 ? formatDuree(totalMin) : '—' },
                      { icon: <span className="text-emerald-600 font-bold text-sm">€</span>, bg: 'bg-emerald-50', label: 'Indemnités km', value: totalKm > 0 ? `${fraisTotal.toFixed(2)} €` : '—' },
                      { icon: <Clock className="w-4 h-4 text-violet-600" />, bg: 'bg-violet-50', label: 'Temps soins', value: formatDuree(dureSoins) },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>{s.icon}</div>
                        <div><p className="text-[10px] text-slate-500">{s.label}</p><p className="font-bold text-slate-900 text-sm">{s.value}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="lg:flex-1 h-[500px] lg:h-auto lg:min-h-[600px] p-4 bg-slate-100">
          <TourneeMap
            rdvs={orderedRdvs}
            routeGeo={routeGeo}
            depart={depart ?? undefined}
            activeSegments={activeSegments.length > 0 ? activeSegments : Array(orderedRdvs.length + (depart ? 1 : 0)).fill(true)}
          />
        </div>
      </div>
    </AppShell>
  );
}

function SegRow({ seg, color, segIdx, active, onToggle }: { seg: Segment | null; color: string; segIdx: number; active: boolean; onToggle: (i: number) => void; }) {
  return (
    <div className="flex items-center gap-3 py-1 pl-1">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18`, border: `2px solid ${color}30` }}>
        <Car className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex items-center gap-3 text-sm flex-1" style={{ color: active ? color : '#94a3b8' }}>
        {seg ? (<><span className="font-semibold">{seg.km.toFixed(1)} km</span><span className="text-slate-300">|</span><Clock className="w-3.5 h-3.5 opacity-60" /><span className="font-semibold">{formatDuree(seg.min)}</span></>)
          : <span className="text-slate-400 text-xs italic">Calculez pour voir le trajet</span>}
      </div>
      <button onClick={() => onToggle(segIdx)} title={active ? 'Masquer ce tracé' : 'Afficher ce tracé'}
        className="w-11 h-11 -m-2.5 flex items-center justify-center transition-all flex-shrink-0">
        <span className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
          style={{ borderColor: active ? color : '#cbd5e1', backgroundColor: active ? color : 'transparent' }}>
          {active && <span className="text-white text-[10px] font-bold">✓</span>}
        </span>
      </button>
    </div>
  );
}

// ── Visit card with optional GPS fine-tune map ──
function VisitCard({ rdv, index, color, onCoordsUpdated }: {
  rdv: RendezVous; index: number; color: string;
  onCoordsUpdated: (lat: number, lng: number) => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const coords = getRdvCoords(rdv);

  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 text-white font-bold text-sm" style={{ backgroundColor: color }}>{index+1}</div>
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{getRdvLabel(rdv)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{rdv.heure_debut.replace(':','h')} – {rdv.heure_fin.replace(':','h')}</p>
          </div>
          <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500">{index+1}</span>
          </div>
        </div>
        {rdv.patient?.adresse && <p className="text-[11px] text-slate-400 mt-1.5 truncate">{rdv.patient.adresse}, {rdv.patient.ville}</p>}
        {!coords && <p className="text-[10px] text-amber-600 mt-1">⚠ Adresse non géolocalisée — modifiez le RDV et resélectionnez l'adresse</p>}

        {coords && (
          <>
            <button onClick={() => setShowMap(s => !s)}
              className="flex items-center gap-1.5 text-[11px] text-primary-600 font-medium hover:text-primary-700 transition-colors mt-2">
              {showMap ? <ChevronDown className="w-3.5 h-3.5 rotate-180" /> : <MapPin className="w-3 h-3" />}
              {showMap ? 'Masquer la carte' : 'Affiner la position'}
            </button>
            {showMap && (
              <div className="mt-2">
                <MiniMapPicker lat={coords.lat} lng={coords.lng} onChange={onCoordsUpdated} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
