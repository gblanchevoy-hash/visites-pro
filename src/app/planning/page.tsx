'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { RendezVous } from '@/types';
import {
  formatDate, formatDateLong, getWeekDays, getMonthDays,
  toISODate, isSameDay, addDays,
} from '@/lib/utils/dates';
import { calculerSegment, distanceHaversine, formatDuree } from '@/lib/utils/geo';
import { ChevronLeft, ChevronRight, Plus, Car, Clock, MapPin, Calendar, ChevronDown, ChevronUp, ArrowLeft, FileText, Users, ArrowRight as ArrowRightIcon } from 'lucide-react';
import RdvModal from '@/components/planning/RdvModal';
import { cn } from '@/lib/utils/cn';
import NoteTooltip from '@/components/ui/NoteTooltip';
import toast from 'react-hot-toast';

type ViewMode = 'jour' | 'semaine' | 'mois';

// Dynamic colors based on statut + time context
function getRdvColors(rdv: RendezVous) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTime  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const isToday  = rdv.date === todayStr;
  const isPast   = rdv.date < todayStr || (isToday && rdv.heure_fin < nowTime);

  // Custom colour override from rdv.couleur
  const custom = rdv.couleur;

  if (rdv.statut === 'annule') return { dot: '#94a3b8', border: '#f1f5f9', bg: '#f8fafc', hColor: '#94a3b8' };
  if (rdv.statut === 'effectue') return { dot: '#22c55e', border: '#dcfce7', bg: '#f0fdf4', hColor: '#16a34a' };
  if (rdv.statut === 'reporte') return { dot: '#f97316', border: '#ffedd5', bg: '#fff7ed', hColor: '#ea580c' };

  // planifie
  if (isPast) return { dot: '#94a3b8', border: '#e2e8f0', bg: '#f8fafc', hColor: '#94a3b8' };
  if (isToday) {
    const c = custom ?? '#16a34a';
    return { dot: c, border: '#bbf7d0', bg: '#f0fdf4', hColor: '#16a34a' };
  }
  // Future
  const c = custom ?? '#3b82f6';
  return { dot: c, border: '#dbeafe', bg: '#ffffff', hColor: '#2563eb' };
}

const HOUR_HEIGHT = 80;
const DAY_START   = 7;
const HOURS = Array.from({ length: 14 }, (_, i) => i + DAY_START);

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
}
function timeToTop(t: string) {
  return (timeToMinutes(t) - DAY_START * 60) / 60 * HOUR_HEIGHT;
}
function snapTo15(m: number) { return Math.round(m / 15) * 15; }
function fmtH(t: string) {
  const [h, m] = t.split(':');
  return `${parseInt(h)}h${m === '00' ? '00' : m}`;
}
function getRdvLabel(rdv: RendezVous) {
  if (rdv.patient) return `${rdv.patient.prenom ?? ''} ${rdv.patient.nom ?? ''}`.trim();
  const n = rdv.notes ?? '';
  if (n.startsWith('[Occasionnel]')) return n.replace('[Occasionnel] ','').split(' · ')[0].split('\n')[0].trim();
  return 'Passage';
}

// Re-renders every minute so the "current time" line stays accurate without a full page refresh
function useNowMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, 30_000); // check twice a minute, cheap
    return () => clearInterval(interval);
  }, []);
  return now;
}

export default function PlanningPage() {
  const { rendezVous, setRendezVous, updateRendezVous, pushHistory, user, settings } = useAppStore();
  const [view, setView]         = useState<ViewMode>('semaine');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal]     = useState(false);
  const [editRdv, setEditRdv]         = useState<RendezVous | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [travelCache, setTravelCache] = useState<Record<string, { km: number; min: number } | null>>({});
  const computingRef = useRef(false);
  const ghostRef     = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('rendez_vous').select('*, patient:patients(*)')
      .eq('user_id', user.id).order('date').order('heure_debut')
      .then(({ data }) => { if (data) setRendezVous(data as unknown as RendezVous[]); });
  }, [user]);

  const navigate = (dir: number) => {
    if (view === 'jour')     setCurrentDate(d => addDays(d, dir));
    else if (view === 'semaine') setCurrentDate(d => addDays(d, dir * 7));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  const rdvsForDate = useCallback((date: Date) =>
    rendezVous.filter(r => r.date === toISODate(date))
              .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)),
  [rendezVous]);

  const openNew  = (date?: string, time?: string) => {
    setEditRdv(null);
    setSelectedDate(date || toISODate(currentDate));
    setSelectedTime(time ?? null);
    setShowModal(true);
  };
  const openEdit = useCallback((rdv: RendezVous) => { setEditRdv(rdv); setShowModal(true); }, []);

  // ── Travel segments ──
  const segKey = (a: string, b: string) => `${a}->${b}`;
  const getRdvCoords = (rdv: RendezVous) => {
    if (rdv.patient?.lat && rdv.patient?.lng) return { lat: rdv.patient.lat, lng: rdv.patient.lng };
    if (rdv.lat && rdv.lng) return { lat: rdv.lat, lng: rdv.lng };
    return null;
  };

  const getSegment = useCallback((rdvs: RendezVous[], idx: number) => {
    const dep = settings?.adresse_depart_lat ? { lat: settings.adresse_depart_lat, lng: settings.adresse_depart_lng!, id: 'dep' } : null;
    const prevCoords = idx === 0 ? dep : (getRdvCoords(rdvs[idx-1]) ? { ...getRdvCoords(rdvs[idx-1])!, id: rdvs[idx-1].id } : null);
    const prev = prevCoords;
    const currCoords = getRdvCoords(rdvs[idx]);
    const curr = currCoords ? { ...currCoords, id: rdvs[idx].id } : null;
    if (!prev || !curr) return null;
    const k = segKey(prev.id, curr.id);
    if (travelCache[k] !== undefined) return travelCache[k];
    const km = distanceHaversine(prev.lat, prev.lng, curr.lat, curr.lng);
    return { km, min: Math.round(km / 50 * 60) };
  }, [settings, travelCache]);

  const fetchTravelTimes = useCallback(async (rdvs: RendezVous[]) => {
    if (computingRef.current || rdvs.length === 0) return;
    const dep = settings?.adresse_depart_lat ? { lat: settings.adresse_depart_lat, lng: settings.adresse_depart_lng!, id: 'dep' } : null;
    const seq: Array<{ lat: number; lng: number; id: string }> = [];
    if (dep) seq.push(dep);
    rdvs.forEach(r => { if (r.patient?.lat && r.patient?.lng) seq.push({ lat: r.patient.lat, lng: r.patient.lng, id: r.id }); });
    if (seq.length < 2) return;
    computingRef.current = true;
    const updates: Record<string, { km: number; min: number } | null> = {};
    for (let i = 0; i < seq.length - 1; i++) {
      const k = segKey(seq[i].id, seq[i+1].id);
      if (travelCache[k] !== undefined) continue;
      await new Promise(r => setTimeout(r, 350));
      const res = await calculerSegment(seq[i], seq[i+1], settings?.ors_api_key ?? undefined, user?.id);
      updates[k] = res ? { km: res.distance_km, min: res.duree_min } : null;
    }
    if (Object.keys(updates).length) setTravelCache(p => ({ ...p, ...updates }));
    computingRef.current = false;
  }, [settings, travelCache]);

  useEffect(() => {
    const days = view === 'semaine' ? getWeekDays(currentDate) : [currentDate];
    days.forEach(d => { const r = rdvsForDate(d); if (r.length) fetchTravelTimes(r); });
  }, [view, currentDate, rendezVous, settings?.ors_api_key]);

  // ── Week stats ──
  const weekDays   = getWeekDays(currentDate);
  const weekRdvs   = weekDays.flatMap(d => rdvsForDate(d));
  const weekKm     = weekDays.flatMap(d => {
    const dr = rdvsForDate(d);
    return dr.map((_, i) => getSegment(dr, i)?.km ?? 0);
  }).reduce((a, b) => a + b, 0);
  const weekMin    = weekDays.flatMap(d => {
    const dr = rdvsForDate(d);
    return dr.map((_, i) => getSegment(dr, i)?.min ?? 0);
  }).reduce((a, b) => a + b, 0);
  const weekPatients = new Set(
    weekRdvs.map(r => r.patient_id ?? getRdvLabel(r))
  ).size;

  // ── Ghost drag ──
  const createGhost = (rdv: RendezVous, x: number, y: number) => {
    const g = document.createElement('div');
    const { dot, hColor: hc } = getRdvColors(rdv);
    g.style.cssText = `position:fixed;z-index:9999;pointer-events:none;
      background:white;border:1.5px solid #e2e8f0;border-radius:14px;
      padding:10px 14px;box-shadow:0 8px 32px rgba(0,0,0,0.18);
      min-width:160px;transform:translate(-50%,-50%);
      left:${x}px;top:${y}px;opacity:0.95;`;
    g.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <span style="font-size:13px;font-weight:700;color:${hc}">${fmtH(rdv.heure_debut)} – ${fmtH(rdv.heure_fin)}</span>
      <div style="width:8px;height:8px;border-radius:50%;background:${dot};margin-left:8px"></div>
    </div>
    <p style="font-size:12px;color:#1e293b;font-weight:600">${getRdvLabel(rdv)}</p>`;
    document.body.appendChild(g);
    ghostRef.current = g;
    return g;
  };
  const removeGhost = () => { ghostRef.current?.remove(); ghostRef.current = null; };

  // ── Drag & drop ──
  const dragState = useRef<{ rdv: RendezVous; rect: DOMRect; days?: Date[]; moved: boolean } | null>(null);
  const DRAG_THRESHOLD = 8;

  const startDrag = useCallback((e: React.PointerEvent, rdv: RendezVous, container: HTMLElement, days?: Date[]) => {
    e.preventDefault(); e.stopPropagation();

    // On touch devices (tablets, phones) skip the press-and-drag logic entirely —
    // a tap should just open the edit modal immediately, no ghost/drag confusion.
    if (e.pointerType === 'touch') {
      setEditRdv(rdv); setShowModal(true);
      return;
    }

    const sx = e.clientX, sy = e.clientY;
    dragState.current = { rdv, rect: container.getBoundingClientRect(), days, moved: false };

    const onMove = (mv: MouseEvent) => {
      if (!dragState.current) return;
      const dx = mv.clientX - sx, dy = mv.clientY - sy;
      if (!dragState.current.moved && Math.sqrt(dx*dx + dy*dy) > DRAG_THRESHOLD) {
        dragState.current.moved = true;
        createGhost(rdv, mv.clientX, mv.clientY);
        setDraggingId(rdv.id);
      }
      if (dragState.current.moved && ghostRef.current) {
        ghostRef.current.style.left = `${mv.clientX}px`;
        ghostRef.current.style.top  = `${mv.clientY}px`;
        const rect = dragState.current.rect;
        const relY = mv.clientY - rect.top;
        const mins = snapTo15(Math.max(DAY_START*60, DAY_START*60 + Math.round(relY/HOUR_HEIGHT*60)));
        const t = minutesToTime(Math.min(mins, 22*60));
        const hEl = ghostRef.current.querySelector('span');
        if (hEl) hEl.textContent = `${fmtH(t)} – ${fmtH(minutesToTime(Math.min(mins + rdv.duree_minutes, 23*60)))}`;
      }
    };
    const onUp = async (up: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!dragState.current) { setDraggingId(null); return; }
      const { rdv: r, rect, days: ds, moved } = dragState.current;
      removeGhost();
      if (!moved) {
        setDraggingId(null); dragState.current = null;
        setEditRdv(r); setShowModal(true); return;
      }
      const relY = up.clientY - rect.top;
      const mins = snapTo15(Math.max(DAY_START*60, DAY_START*60 + Math.round(relY/HOUR_HEIGHT*60)));
      const newH = minutesToTime(Math.min(mins, 22*60));
      const newF = minutesToTime(Math.min(mins + r.duree_minutes, 23*60));
      let newDate = r.date;
      if (ds && ds.length > 1) {
        const colW = (rect.width - 64) / ds.length;
        const relX = up.clientX - rect.left - 64;
        newDate = toISODate(ds[Math.max(0, Math.min(ds.length-1, Math.floor(relX/colW)))]);
      }
      if (newH === r.heure_debut && newDate === r.date) { setDraggingId(null); dragState.current = null; return; }
      const { data, error } = await supabase.from('rendez_vous')
        .update({ date: newDate, heure_debut: newH, heure_fin: newF })
        .eq('id', r.id).select('*, patient:patients(*)').single();
      if (error) toast.error('Erreur déplacement');
      else {
        const updated = data as unknown as RendezVous;
        pushHistory({ type: 'UPDATE_RDV', before: r, after: updated });
        updateRendezVous(updated);
        toast.success(`Déplacé → ${fmtH(newH)}`);
      }
      setDraggingId(null); dragState.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pushHistory, updateRendezVous]);

  // ── Travel badge ──
  const TravelBadge = ({ seg }: { seg: { km: number; min: number } | null }) => {
    if (!seg) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
        <Car className="w-3 h-3" />
        {seg.km.toFixed(1)} km · {formatDuree(seg.min)}
      </div>
    );
  };

  // ── RDV Card block ──
  const RdvCard = ({ rdv, style, onPointerDown }: {
    rdv: RendezVous;
    style: React.CSSProperties;
    onPointerDown: (e: React.PointerEvent) => void;
  }) => {
    const { dot, border, bg, hColor } = getRdvColors(rdv);
    const isDrag = draggingId === rdv.id;
    const height = parseFloat(style.height as string);

    // Extract user notes — strip the [Occasionnel] header line if present
    const rawNotes = rdv.notes ?? '';
    const isOcc = rawNotes.startsWith('[Occasionnel]');
    const userNotes = isOcc ? rawNotes.split('\n').slice(1).join('\n').trim() : rawNotes.trim();

    // Parse occasionnel header for address/phone: "[Occasionnel] Nom · Adresse · Tel"
    const occParts = isOcc ? rawNotes.split('\n')[0].replace('[Occasionnel] ', '').split(' · ') : [];
    const occAdresse = isOcc ? (occParts[1] ?? '') : '';
    const occTelephone = isOcc ? (occParts[2] ?? '') : '';

    const adresse   = rdv.patient?.adresse || occAdresse || '';
    const ville     = rdv.patient?.ville || '';
    const telephone = rdv.patient?.telephone || occTelephone || '';

    const hasInfo = !!(adresse || telephone || userNotes);

    const tooltipContent = (
      <div className="space-y-1.5">
        <p className="font-semibold text-[12px]" style={{ color: '#92400e' }}>{getRdvLabel(rdv)}</p>
        <p className="text-[11px] opacity-80">{fmtH(rdv.heure_debut)} – {fmtH(rdv.heure_fin)}</p>
        {adresse && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-amber-200/60">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-60" />
            <span className="text-[11px]">{adresse}{ville ? `, ${ville}` : ''}</span>
          </div>
        )}
        {telephone && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] opacity-60">📞</span>
            <span className="text-[11px]">{telephone}</span>
          </div>
        )}
        {userNotes && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-amber-200/60">
            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-60" />
            <span className="text-[11px] whitespace-pre-wrap">{userNotes}</span>
          </div>
        )}
      </div>
    );

    const card = (
      <div
        onPointerDown={onPointerDown}
        className={cn('absolute select-none z-20 transition-all duration-100 group',
          isDrag ? 'opacity-30 scale-[0.97]' : 'cursor-grab hover:scale-[1.01] hover:shadow-md')}
        style={{
          ...style,
          background: bg,
          border: `1.5px solid ${border}`,
          borderRadius: '14px',
          boxShadow: isDrag ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
          padding: '8px 10px',
          overflow: 'hidden',
          touchAction: 'manipulation',
        }}>
        {/* Header row: time + dot */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] font-bold leading-tight" style={{ color: hColor }}>
            {fmtH(rdv.heure_debut)} – {fmtH(rdv.heure_fin)}
          </span>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
        </div>
        {/* Name */}
        {height > 38 && (
          <p className="text-[12px] font-semibold text-slate-800 mt-1 leading-tight truncate">
            {getRdvLabel(rdv)}
          </p>
        )}
        {/* Address */}
        {height > 60 && rdv.patient?.adresse && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate leading-tight">
            {rdv.patient.adresse}
          </p>
        )}
        {/* Info indicator dot */}
        {hasInfo && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white" style={{ background: hColor, opacity: 0.7 }} />
        )}
      </div>
    );
    return hasInfo ? <NoteTooltip content={tooltipContent}>{card}</NoteTooltip> : card;
  };

  // ── Day View ──
  const DayView = () => {
    const ref = useRef<HTMLDivElement>(null);
    const dayRdvs = rdvsForDate(currentDate);
    const now = useNowMinute();
    const isToday = isSameDay(currentDate, now);
    const nowTop = (now.getHours() * 60 + now.getMinutes() - DAY_START * 60) / 60 * HOUR_HEIGHT;
    const showNowLine = isToday && now.getHours() >= DAY_START && now.getHours() < DAY_START + HOURS.length;

    return (
      <div className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
        <div className="relative mx-4 mt-2" ref={ref}>
          {HOURS.map(h => (
            <div key={h} className="flex" style={{ height: `${HOUR_HEIGHT}px` }}>
              <div className="w-14 shrink-0 flex items-start pt-2 justify-end pr-3">
                <span className="text-[12px] text-slate-400 font-medium">{h}h00</span>
              </div>
              <div className="flex-1 border-t border-slate-200/70 border-dashed cursor-pointer hover:bg-blue-50/30 transition-colors"
                onClick={() => { if (!draggingId) openNew(toISODate(currentDate), `${String(h).padStart(2,'0')}:00`); }} />
            </div>
          ))}
          {/* Current time indicator */}
          {showNowLine && (
            <div className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{ top: `${nowTop}px` }}>
              <div className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white flex-shrink-0" style={{ background: '#2563eb' }}>
                {now.getHours().toString().padStart(2,'0')}:{now.getMinutes().toString().padStart(2,'0')}
              </div>
              <div className="flex-1 h-[2px]" style={{ background: '#2563eb' }} />
              <div className="w-2 h-2 rounded-full -mr-1" style={{ background: '#2563eb' }} />
            </div>
          )}
          {dayRdvs.map((rdv, idx) => {
            const top = timeToTop(rdv.heure_debut);
            const h   = Math.max((rdv.duree_minutes / 60) * HOUR_HEIGHT, 36);
            const seg = getSegment(dayRdvs, idx);
            return (
              <div key={rdv.id}>
                {seg && (
                  <div className="absolute z-10" style={{ top: `${top - 26}px`, left: '56px' }}>
                    <TravelBadge seg={seg} />
                  </div>
                )}
                <RdvCard rdv={rdv}
                  style={{ top: `${top}px`, height: `${h}px`, left: '56px', right: '4px' }}
                  onPointerDown={e => ref.current && startDrag(e, rdv, ref.current)} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Week View ──
  const WeekView = () => {
    const ref  = useRef<HTMLDivElement>(null);
    const days = getWeekDays(currentDate);
    const now = useNowMinute();
    const todayIdx = days.findIndex(d => isSameDay(d, now));
    const nowTop = (now.getHours() * 60 + now.getMinutes() - DAY_START * 60) / 60 * HOUR_HEIGHT;
    const showNowLine = todayIdx >= 0 && now.getHours() >= DAY_START && now.getHours() < DAY_START + HOURS.length;
    const todayLeft = `calc(56px + ${todayIdx} * (100% - 56px) / 7)`;
    const todayWidth = `calc((100% - 56px) / 7)`;

    return (
      <div className="flex-1 overflow-auto" style={{ background: '#f8fafc' }}>
        {/* Day header */}
        <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white shadow-sm" style={{ paddingLeft: '56px' }}>
          {days.map(d => {
            const isToday = isSameDay(d, new Date());
            return (
              <div key={d.toISOString()}
                className={cn('flex-1 py-3 text-center border-l border-slate-100 cursor-pointer hover:bg-blue-50/40 transition-colors', isToday && 'bg-blue-50/60')}
                onClick={() => openNew(toISODate(d))}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {formatDate(d, 'EEE').toUpperCase().replace('.', '')}
                </p>
                <p className={cn('text-2xl font-bold mt-0.5', isToday ? 'text-blue-600' : 'text-slate-800')}>
                  {formatDate(d, 'd')}
                </p>
              </div>
            );
          })}
        </div>
        {/* Time grid */}
        <div className="relative" ref={ref}>
          {HOURS.map(h => (
            <div key={h} className="flex" style={{ height: `${HOUR_HEIGHT}px` }}>
              <div className="w-14 shrink-0 flex items-start pt-2 justify-end pr-3">
                <span className="text-[12px] text-slate-400 font-medium">{h}h00</span>
              </div>
              {days.map(d => (
                <div key={d.toISOString()}
                  className={cn('flex-1 border-t border-l border-slate-200/70 border-dashed cursor-pointer hover:bg-blue-50/20 transition-colors', isSameDay(d, new Date()) && 'bg-blue-50/20')}
                  onClick={() => { if (!draggingId) openNew(toISODate(d), `${String(h).padStart(2,'0')}:00`); }} />
              ))}
            </div>
          ))}
          {/* Current time indicator — only under today's column */}
          {showNowLine && (
            <div className="absolute z-30 pointer-events-none flex items-center"
              style={{ top: `${nowTop}px`, left: todayLeft, width: todayWidth }}>
              <div className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white flex-shrink-0 -ml-px" style={{ background: '#2563eb' }}>
                {now.getHours().toString().padStart(2,'0')}:{now.getMinutes().toString().padStart(2,'0')}
              </div>
              <div className="flex-1 h-[2px]" style={{ background: '#2563eb' }} />
            </div>
          )}
          {/* RDV cards */}
          {days.map((day, di) => {
            const dayRdvs = rdvsForDate(day);
            return dayRdvs.map((rdv, idx) => {
              const top  = timeToTop(rdv.heure_debut);
              const h    = Math.max((rdv.duree_minutes / 60) * HOUR_HEIGHT, 36);
              const seg  = getSegment(dayRdvs, idx);
              const left = `calc(56px + ${di} * (100% - 56px) / 7 + 3px)`;
              const w    = `calc((100% - 56px) / 7 - 6px)`;
              return (
                <div key={rdv.id}>
                  {seg && (
                    <div className="absolute z-10 pointer-events-none"
                      style={{ top: `${top - 26}px`, left }}>
                      <TravelBadge seg={seg} />
                    </div>
                  )}
                  <RdvCard rdv={rdv}
                    style={{ top: `${top}px`, height: `${h}px`, left, width: w }}
                    onPointerDown={e => ref.current && startDrag(e, rdv, ref.current, days)} />
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  };

  // ── Month View ──
  const MonthView = () => {
    const days = getMonthDays(currentDate);
    return (
      <div className="flex-1 overflow-auto p-4" style={{ background: '#f8fafc' }}>
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {['LUN','MAR','MER','JEU','VEN','SAM','DIM'].map(j => (
            <div key={j} className="bg-slate-100 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{j}</div>
          ))}
          {days.map(day => {
            const inMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, new Date());
            const dr = rdvsForDate(day);
            return (
              <div key={day.toISOString()} onClick={() => openNew(toISODate(day))}
                className={cn('bg-white min-h-[90px] p-2 cursor-pointer hover:bg-blue-50/30 transition-colors',
                  !inMonth && 'bg-slate-50/60', isToday && 'ring-2 ring-inset ring-blue-400')}>
                <p className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold mb-1',
                  isToday ? 'bg-blue-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300')}>
                  {formatDate(day, 'd')}
                </p>
                {dr.slice(0, 3).map(rdv => (
                  <div key={rdv.id}
                    onClick={e => { e.stopPropagation(); openEdit(rdv); }}
                    className="mb-0.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold truncate cursor-pointer hover:opacity-80 border"
                    style={(() => { const c = getRdvColors(rdv); return { background: c.bg, borderColor: c.border, color: c.hColor }; })()}>
                    {fmtH(rdv.heure_debut)} {getRdvLabel(rdv)}
                  </div>
                ))}
                {dr.length > 3 && <p className="text-[10px] text-slate-400 font-medium">+{dr.length - 3}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const subtitle = view === 'jour'
    ? formatDateLong(currentDate)
    : view === 'semaine' ? `Semaine du ${formatDate(getWeekDays(currentDate)[0], 'd MMM')}`
    : formatDate(currentDate, 'MMMM yyyy');

  return (
    <AppShell>
      <Topbar title="Planning" subtitle={subtitle} actions={
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-0.5">
            {(['jour','semaine','mois'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-4 py-1.5 rounded-xl text-[13px] font-semibold capitalize transition-all',
                  view === v
                    ? 'bg-white shadow-sm text-slate-900 border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700')}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {/* Nav */}
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            Aujourd'hui
          </button>
          <button onClick={() => navigate(1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* + RDV */}
          <button onClick={() => openNew()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
            <Plus className="w-4 h-4" /> RDV
          </button>
        </div>
      } />

      {/* Calendar content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === 'jour'    && <DayView />}
        {view === 'semaine' && <WeekView />}
        {view === 'mois'    && <MonthView />}
      </div>

      {/* Bottom stats bar — week view only */}
      {view === 'semaine' && (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 shadow-lg">
          <div className="flex items-center justify-between px-6 py-3 gap-6 flex-wrap">
            {/* Récapitulatif label */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
                <Calendar className="w-5 h-5" style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Récapitulatif de la semaine</p>
                <p className="text-[11px] text-slate-400">{weekRdvs.length} rendez-vous planifié{weekRdvs.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="hidden md:block w-px h-10 bg-slate-100" />

            {/* KPIs */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <Car className="w-5 h-5" style={{ color: '#16a34a' }} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Distance totale</p>
                <p className="text-[17px] font-bold text-slate-900">{weekKm > 0 ? `${weekKm.toFixed(1)} km` : '— km'}</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-10 bg-slate-100" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fdf4ff' }}>
                <Clock className="w-5 h-5" style={{ color: '#9333ea' }} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Durée totale</p>
                <p className="text-[17px] font-bold text-slate-900">{weekMin > 0 ? formatDuree(weekMin) : '—'}</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-10 bg-slate-100" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
                <Users className="w-5 h-5" style={{ color: '#ea580c' }} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Patients différents</p>
                <p className="text-[17px] font-bold text-slate-900">{weekPatients}</p>
              </div>
            </div>

            {/* CTA */}
            <Link href="/tournees"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all hover:shadow-md"
              style={{ background: '#eff6ff', color: '#2563eb' }}>
              Voir les tournées <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {showModal && (
        <RdvModal rdv={editRdv} defaultDate={selectedDate} defaultTime={selectedTime ?? undefined}
          onClose={() => { setShowModal(false); setEditRdv(null); setSelectedTime(null); }} />
      )}
    </AppShell>
  );
}
