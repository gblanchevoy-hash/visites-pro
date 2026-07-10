'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { ChevronLeft, ChevronRight, Plus, Car, Clock, Calendar, Users, ArrowRight as ArrowRightIcon } from 'lucide-react';
import RdvModal from '@/components/planning/RdvModal';
import { cn } from '@/lib/utils/cn';
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
  const { rendezVous, setRendezVous, updateRendezVous, pushHistory, user, settings, loadRendezVous } = useAppStore();
  const [view, setView]         = useState<ViewMode>('semaine');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal]     = useState(false);
  const [editRdv, setEditRdv]         = useState<RendezVous | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const { segmentCache, setSegmentCache } = useAppStore();
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
  // Cache key basé sur les coordonnées GPS (pas les IDs) pour que les RDVs récurrents
  // avec le même patient partagent le même cache et affichent des distances cohérentes
  const segKey = (a: string, b: string) => `${a}->${b}`;
  const coordKey = (lat1?: number|null, lng1?: number|null, lat2?: number|null, lng2?: number|null) =>
    (lat1 && lng1 && lat2 && lng2)
      ? `${lat1.toFixed(4)},${lng1.toFixed(4)}->${lat2.toFixed(4)},${lng2.toFixed(4)}`
      : null;
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
    if (segmentCache[k] !== undefined) return segmentCache[k];
    // Fallback vol d'oiseau × 1.3 (coefficient routier moyen) — remplacé dès qu'ORS répond
    const km = distanceHaversine(prev.lat, prev.lng, curr.lat, curr.lng) * 1.3;
    return { km, min: Math.round(km / 50 * 60) };
  }, [settings, segmentCache]);

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
      // Vérifier aussi par coordonnées GPS
      const ck2 = coordKey(seq[i].lat, seq[i].lng, seq[i+1].lat, seq[i+1].lng);
      if (ck2 && segmentCache[ck2] !== undefined) {
        setSegmentCache(k, segmentCache[ck2]);
        continue;
      }
      if (segmentCache[k] !== undefined) continue;
      await new Promise(r => setTimeout(r, 350));
      const res = await calculerSegment(seq[i], seq[i+1], settings?.ors_api_key ?? undefined, user?.id);
      updates[k] = res ? { km: res.distance_km, min: res.duree_min } : null;
    }
    if (Object.keys(updates).length) {
      // Stocker par IDs ET par coordonnées GPS pour cohérence des RDVs récurrents
      for (let i = 0; i < seq.length - 1; i++) {
        const k = segKey(seq[i].id, seq[i+1].id);
        if (updates[k] !== undefined) {
          setSegmentCache(k, updates[k]);
          const ck = coordKey(seq[i].lat, seq[i].lng, seq[i+1].lat, seq[i+1].lng);
          if (ck) setSegmentCache(ck, updates[k]);
        }
      }
    }
    computingRef.current = false;
  }, [settings, segmentCache]);

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

  // ── Context menu state ──
  const [ctxMenu, setCtxMenu] = useState<{ rdv: RendezVous; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LONG_PRESS_DURATION = 500; // ms pour déclencher le menu sur touch

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  const handleCtxSupprimer = async (rdv: RendezVous) => {
    setCtxMenu(null);
    if (!confirm(`Supprimer le RDV de ${getRdvLabel(rdv)} ?`)) return;
    const { error } = await supabase.from('rendez_vous').delete().eq('id', rdv.id);
    if (error) { toast.error('Erreur suppression'); return; }
    const store = useAppStore.getState();
    store.removeRendezVous(rdv.id);
    pushHistory({ type: 'DELETE_RDV', rdv });
    toast.success('RDV supprimé');
  };

  const handleCtxDupliquer = async (rdv: RendezVous) => {
    setCtxMenu(null);
    // Copie complète de tous les champs — rien ne doit être perdu
    const { data, error } = await supabase.from('rendez_vous').insert({
      user_id:        rdv.user_id,
      patient_id:     rdv.patient_id ?? null,
      date:           rdv.date,
      heure_debut:    rdv.heure_debut,
      heure_fin:      rdv.heure_fin,
      duree_minutes:  rdv.duree_minutes,
      statut:         'planifie',
      notes:          rdv.notes ?? null,
      couleur:        rdv.couleur ?? null,
      lat:            rdv.lat ?? null,
      lng:            rdv.lng ?? null,
    }).select('*, patient:patients(*)').single();
    if (error) { toast.error('Erreur duplication'); return; }
    const store = useAppStore.getState();
    store.addRendezVous(data as unknown as RendezVous);
    pushHistory({ type: 'ADD_RDV', rdv: data as unknown as RendezVous });
    toast.success(`"${getRdvLabel(rdv)}" dupliqué`);
  };

  // ── Drag & drop ──
  // Double-clic → modal | Clic droit → menu contextuel | Maintien+glisser → déplace

  const dragState = useRef<{
    rdv: RendezVous; rect: DOMRect; days?: Date[];
    startX: number; startY: number; moved: boolean;
  } | null>(null);

  const DRAG_PX = 5;

  // Track last click time to detect double-click in pointerdown
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  const DOUBLE_CLICK_MS = 280;

  const startDrag = useCallback((e: React.PointerEvent, rdv: RendezVous, container: HTMLElement, days?: Date[]) => {
    if (e.button === 2) return;
    if (e.pointerType === 'touch') {
      // Appui long → menu contextuel / appui court → ouvre la modale
      const touchX = e.clientX, touchY = e.clientY;
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        // Vibration haptique si disponible
        if (navigator.vibrate) navigator.vibrate(30);
        setCtxMenu({ rdv, x: touchX, y: touchY });
      }, LONG_PRESS_DURATION);

      const cancelLongPress = () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      };

      const onTouchEnd = () => {
        document.removeEventListener('pointerup', onTouchEnd);
        document.removeEventListener('pointermove', onTouchMove);
        // Si le timer est toujours actif = appui court → ouvrir modal
        if (longPressTimer.current) {
          cancelLongPress();
          setEditRdv(rdv);
          setShowModal(true);
        }
      };

      const onTouchMove = (mv: PointerEvent) => {
        // Si l'utilisateur glisse, annuler le long-press
        const dx = mv.clientX - touchX, dy = mv.clientY - touchY;
        if (Math.sqrt(dx*dx + dy*dy) > 8) cancelLongPress();
      };

      document.addEventListener('pointerup', onTouchEnd, { once: true });
      document.addEventListener('pointermove', onTouchMove);
      return;
    }
    e.stopPropagation();

    const now = Date.now();

    // Detect double-click: two rapid clicks on the same rdv → open modal, no drag
    if (lastClickRef.current && lastClickRef.current.id === rdv.id && now - lastClickRef.current.time < DOUBLE_CLICK_MS) {
      lastClickRef.current = null;
      setEditRdv(rdv);
      setShowModal(true);
      return;
    }
    lastClickRef.current = { id: rdv.id, time: now };

    const startX = e.clientX;
    const startY = e.clientY;
    const rect   = container.getBoundingClientRect();

    dragState.current = { rdv, rect, days, startX, startY, moved: false };

    function onMove(mv: MouseEvent) {
      if (!dragState.current) return;
      const dx   = mv.clientX - startX;
      const dy   = mv.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!dragState.current.moved && dist > DRAG_PX) {
        dragState.current.moved = true;
        createGhost(rdv, mv.clientX, mv.clientY);
        setDraggingId(rdv.id);
        document.body.style.cursor = 'grabbing';
      }

      if (dragState.current.moved && ghostRef.current) {
        ghostRef.current.style.left = `${mv.clientX}px`;
        ghostRef.current.style.top  = `${mv.clientY}px`;

        const relY = mv.clientY - dragState.current.rect.top;
        const mins = snapTo15(Math.max(DAY_START * 60, DAY_START * 60 + Math.round(relY / HOUR_HEIGHT * 60)));
        const hEl  = ghostRef.current.querySelector('span');
        if (hEl) {
          const newStart = minutesToTime(Math.min(mins, 22 * 60));
          const newEnd   = minutesToTime(Math.min(mins + rdv.duree_minutes, 23 * 60));
          hEl.textContent = `${fmtH(newStart)} – ${fmtH(newEnd)}`;
        }
      }
    }

    async function onUp(up: MouseEvent) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.body.style.cursor = '';

      if (!dragState.current) { setDraggingId(null); return; }

      const { rdv: r, days: ds, moved } = dragState.current;
      removeGhost();
      setDraggingId(null);
      dragState.current = null;

      if (!moved) return;

      const relY    = up.clientY - rect.top;
      const mins    = snapTo15(Math.max(DAY_START * 60, DAY_START * 60 + Math.round(relY / HOUR_HEIGHT * 60)));
      const newH    = minutesToTime(Math.min(mins, 22 * 60));
      const newF    = minutesToTime(Math.min(mins + r.duree_minutes, 23 * 60));
      let   newDate = r.date;

      if (ds && ds.length > 1) {
        const colW = (rect.width - 64) / ds.length;
        const relX = up.clientX - rect.left - 64;
        const colIdx = Math.max(0, Math.min(ds.length - 1, Math.floor(relX / colW)));
        newDate = toISODate(ds[colIdx]);
      }

      if (newH === r.heure_debut && newDate === r.date) return;

      const { data, error } = await supabase
        .from('rendez_vous')
        .update({ date: newDate, heure_debut: newH, heure_fin: newF })
        .eq('id', r.id)
        .select('*, patient:patients(*)')
        .single();

      if (error) {
        toast.error('Erreur lors du déplacement');
      } else {
        const updated = data as unknown as RendezVous;
        pushHistory({ type: 'UPDATE_RDV', before: r, after: updated });
        updateRendezVous(updated);
        toast.success(`Déplacé → ${fmtH(newH)}`);
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
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
    const { dot, hColor } = getRdvColors(rdv);
    const isDrag = draggingId === rdv.id;
    const height = parseFloat(style.height as string);

    const rawNotes = rdv.notes ?? '';
    const isOcc = rawNotes.startsWith('[Occasionnel]');
    const userNotes = isOcc ? rawNotes.split('\n').slice(1).join('\n').trim() : rawNotes.trim();
    const occParts = isOcc ? rawNotes.split('\n')[0].replace('[Occasionnel] ', '').split(' · ') : [];
    const occAdresse  = isOcc ? (occParts[1] ?? '') : '';
    const occTelephone = isOcc ? (occParts[2] ?? '') : '';
    const adresse   = rdv.patient?.adresse || occAdresse || '';
    const ville     = rdv.patient?.ville || '';
    const telephone = rdv.patient?.telephone || occTelephone || '';
    const hasInfo = !!(adresse || telephone || userNotes);

    // Rich tooltip matching bobv.png style
    const patientPhoto = rdv.patient?.photo_url;

    const tooltipContent = (
      <div style={{ minWidth: '220px' }}>
        {/* Header: photo + name + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          {patientPhoto ? (
            <img src={patientPhoto} alt="" style={{ width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid #E2E8F0' }} />
          ) : (
            <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:dot+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:dot, display:'block' }} />
            </div>
          )}
          <div>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', display:'block' }}>{getRdvLabel(rdv)}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>{fmtH(rdv.heure_debut)} — {fmtH(rdv.heure_fin)}</span>
          </div>
        </div>
        {adresse && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>📍</span>
            <span style={{ fontSize: '12px', color: '#374151' }}>{adresse}{ville ? `, ${ville}` : ''}</span>
          </div>
        )}
        {telephone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>📞</span>
            <span style={{ fontSize: '12px', color: '#374151' }}>{telephone}</span>
          </div>
        )}
        {userNotes && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>💬</span>
            <span style={{ fontSize: '12px', color: '#374151', whiteSpace: 'pre-wrap' }}>{userNotes}</span>
          </div>
        )}
      </div>
    );

    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
    const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
      if (!hasInfo || e.buttons !== 0) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => {
        const x = Math.min(Math.max(230, rect.left), window.innerWidth - 290);
        setTooltipPos({ x, y: rect.bottom + 8 });
        setTooltipVisible(true);
      }, 180);
    };

    const handleMouseLeave = () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      setTooltipVisible(false);
      setTooltipPos(null);
    };

    return (
      <>
        <div
          onPointerDown={e => { if (e.button !== 2) onPointerDown(e); }}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ rdv, x: e.clientX, y: e.clientY }); }}
          onMouseEnter={hasInfo ? handleMouseEnter : undefined}
          onMouseLeave={hasInfo ? handleMouseLeave : undefined}
          className={cn('absolute select-none z-20 transition-all duration-100',
            isDrag ? 'opacity-30 scale-[0.97]' : 'cursor-grab hover:shadow-md')}
          style={{
            ...style,
            background: '#ffffff',
            borderRadius: '8px',
            borderLeft: `3px solid ${hColor}`,
            border: `1px solid #e2e8f0`,
            borderLeftWidth: '3px',
            borderLeftColor: hColor,
            boxShadow: isDrag ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            padding: '7px 10px',
            overflow: 'hidden',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}>
          {/* Time row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', lineHeight: 1.2 }}>
              {fmtH(rdv.heure_debut)} — {fmtH(rdv.heure_fin)}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
          </div>
          {/* Name */}
          {height > 36 && (
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getRdvLabel(rdv)}
            </p>
          )}
          {/* Address */}
          {height > 58 && adresse && (
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {adresse}
            </p>
          )}
        </div>

        {/* Tooltip — white card, bobv.png style */}
        {tooltipVisible && tooltipPos && typeof window !== 'undefined' && createPortal(
          <div style={{
            position: 'fixed', left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px`,
            zIndex: 99999, pointerEvents: 'none', maxWidth: '280px',
          }}>
            <div style={{
              background: '#ffffff', borderRadius: '14px', padding: '14px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #e2e8f0',
            }}>
              {tooltipContent}
            </div>
          </div>,
          document.body
        )}
      </>
    );
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
      <div className="flex-1 overflow-y-auto" style={{ background: '#ffffff' }}>
        <div className="relative mx-4 mt-2" ref={ref}>
          {HOURS.map(h => (
            <div key={h} className="flex" style={{ height: `${HOUR_HEIGHT}px` }}>
              <div className="w-14 shrink-0 flex items-start pt-2 justify-end pr-3">
                <span className="text-[12px] text-slate-400 font-medium">{h}h00</span>
              </div>
              <div className="flex-1 border-t cursor-pointer hover:bg-blue-50/20 transition-colors" style={{ borderColor: "#f1f5f9", borderStyle: "solid" }}
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
      <div className="flex-1 overflow-auto" style={{ background: '#ffffff' }}>
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
                  className={cn('flex-1 border-t border-l cursor-pointer hover:bg-blue-50/15 transition-colors', isSameDay(d, new Date()) && 'bg-blue-50/30')} style={{ borderColor: "#f1f5f9", borderStyle: "solid" }}
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
      <div className="flex-1 overflow-auto p-4" style={{ background: '#ffffff' }}>
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
          onClose={(forceRefresh) => {
            setShowModal(false);
            setEditRdv(null);
            setSelectedTime(null);
            // Recharger tous les RDVs si une série récurrente vient d'être créée
            if (forceRefresh) {
              loadRendezVous();
            }
          }} />
      )}

      {/* ── Context menu ── */}
      {ctxMenu && createPortal(
        <div style={{
          position: 'fixed', left: `${Math.min(ctxMenu.x, window.innerWidth - 190)}px`,
          top: `${Math.min(ctxMenu.y, window.innerHeight - 180)}px`,
          zIndex: 99999, width: '180px',
          background: '#ffffff', border: '1px solid #E2E8F0',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          overflow: 'hidden', padding: '4px',
        }}
          onClick={e => e.stopPropagation()}
        >
          {/* RDV name header */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getRdvLabel(ctxMenu.rdv)}
            </p>
            <p style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtH(ctxMenu.rdv.heure_debut)} – {fmtH(ctxMenu.rdv.heure_fin)}</p>
          </div>
          {[
            { icon: '✏️', label: 'Modifier',   action: () => { setCtxMenu(null); setEditRdv(ctxMenu.rdv); setShowModal(true); } },
            { icon: '📋', label: 'Dupliquer',  action: () => handleCtxDupliquer(ctxMenu.rdv) },
            { icon: '🗑️', label: 'Supprimer',  action: () => handleCtxSupprimer(ctxMenu.rdv), danger: true },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '9px 12px', border: 'none', background: 'none',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left' as const,
                fontSize: '13px', fontWeight: 500,
                color: (item as { danger?: boolean }).danger ? '#EF4444' : '#0F172A',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = (item as { danger?: boolean }).danger ? '#FEF2F2' : '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </AppShell>
  );
}
