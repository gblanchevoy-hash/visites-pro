'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { toISODate } from '@/lib/utils/dates';
import { RendezVous } from '@/types';
import Link from 'next/link';
import {
  Navigation, Users, Calendar, MapPin,
  Clock, ChevronRight, Shield, MoreVertical,
  TrendingUp
} from 'lucide-react';

// Decorative dots pattern (top-right background)
function DecorativeDots() {
  const dots = [
    [820, 40], [920, 80], [1060, 44], [1180, 100], [1300, 48],
    [880, 160], [1100, 176], [1240, 136],
  ];
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {dots.map(([x,y], i) => (
        <div key={i} style={{
          position:'absolute', left:`${x/14}%`, top:`${y/3}%`,
          width: i % 3 === 0 ? '8px' : '5px',
          height: i % 3 === 0 ? '8px' : '5px',
          borderRadius:'50%', background:'#2563EB',
          opacity: 0.12 + (i % 3) * 0.06,
        }} />
      ))}
    </div>
  );
}

const DAY_NAMES_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTH_NAMES_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function formatDayFull(d: Date) {
  return `${DAY_NAMES_FR[d.getDay()].toUpperCase()} ${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

const VISIT_COLORS = ['#2563EB','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4'];

export default function DashboardPage() {
  const { user, patients, settings } = useAppStore();
  const [todayRdvs, setTodayRdvs] = useState<RendezVous[]>([]);
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: string } | null>(null);
  const [forecast, setForecast] = useState<Array<{ day: string; iconAM: string; iconPM: string; tempAM: number; tempPM: number; min: number; max: number; descAM: string; descPM: string }>>([]);
  const [showForecast, setShowForecast] = useState(false);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  useEffect(() => {
    if (!user) return;
    supabase.from('rendez_vous').select('*, patient:patients(*)')
      .eq('user_id', user.id).eq('date', toISODate(today))
      .neq('statut', 'annule').order('heure_debut')
      .then(({ data }) => { setTodayRdvs((data as unknown as RendezVous[]) ?? []); setLoading(false); });
  }, [user]);

  useEffect(() => {
    const lat = settings?.adresse_depart_lat ?? 43.7;
    const lng = settings?.adresse_depart_lng ?? 6.0;
    const icons: Record<string,string> = {'0':'☀️','1':'🌤️','2':'⛅','3':'☁️','45':'🌫️','48':'🌫️','51':'🌦️','53':'🌦️','61':'🌧️','63':'🌧️','71':'🌨️','80':'🌦️','81':'🌧️','95':'⛈️'};
    const descs: Record<string,string> = {'0':'Ensoleillé','1':'Peu nuageux','2':'Partiellement nuageux','3':'Couvert','45':'Brouillard','51':'Bruine légère','61':'Pluie','71':'Neige','80':'Averses','95':'Orage'};
    const JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weathercode&timezone=Europe%2FParis&forecast_days=7`)
      .then(r => r.json()).then(data => {
        const code = String(data.current.weathercode);
        setWeather({ temp: Math.round(data.current.temperature_2m), desc: descs[code]??'', icon: icons[code]??'🌡️' });
        if (data.daily?.time) {
          setForecast(data.daily.time.map((d: string, i: number) => {
            const c = String(data.daily.weathercode[i]);
            const dayName = i === 0 ? 'Auj.' : i === 1 ? 'Dem.' : JOURS[new Date(d).getDay()];
            // Hourly: 24 slots per day, index i*24 = midnight, +8 = 8h, +14 = 14h
            const baseIdx = i * 24;
            const cAM = data.hourly?.weathercode ? String(data.hourly.weathercode[baseIdx + 8]) : c;
            const cPM = data.hourly?.weathercode ? String(data.hourly.weathercode[baseIdx + 14]) : c;
            const tAM = data.hourly?.temperature_2m ? Math.round(data.hourly.temperature_2m[baseIdx + 8]) : Math.round(data.daily.temperature_2m_min[i]);
            const tPM = data.hourly?.temperature_2m ? Math.round(data.hourly.temperature_2m[baseIdx + 14]) : Math.round(data.daily.temperature_2m_max[i]);
            return {
              day: dayName,
              iconAM: icons[cAM]??'🌡️', iconPM: icons[cPM]??'🌡️',
              descAM: descs[cAM]??'', descPM: descs[cPM]??'',
              tempAM: tAM, tempPM: tPM,
              min: Math.round(data.daily.temperature_2m_min[i]),
              max: Math.round(data.daily.temperature_2m_max[i]),
            };
          }));
        }
      }).catch(() => {});
  }, [settings?.adresse_depart_lat]);

  const effectues = todayRdvs.filter(r => r.statut === 'effectue').length;
  const aVenir    = todayRdvs.filter(r => r.statut === 'planifie').length;
  const isConfigured = !!settings?.adresse_depart_lat;

  const pseudo = settings?.pseudonyme ?? user?.email?.split('@')[0] ?? '';

  // Quick action cards
  const quickCards = [
    { href:'/tournees', label:'Ma tournée',  sub:'du jour',                     icon: Navigation, bg:'#2563EB', iconBg:'#1D4ED8' },
    { href:'/planning', label:'Planning',     sub:'semaine',                     icon: Calendar,   bg:'#7C3AED', iconBg:'#6D28D9' },
    { href:'/patients', label:'Patients',     sub:`${patients.length} enregistrés`, icon: Users,  bg:'#059669', iconBg:'#047857' },
    { href:'/depart',   label:'Mon départ',   sub: isConfigured ? 'Configuré ✓' : 'À configurer', icon: MapPin, bg:'#D97706', iconBg:'#B45309' },
  ];

  return (
    <AppShell>
      <div style={{ flex:1, overflow:'auto', background:'#F8FAFC', position:'relative' }}>

        {/* ── Header ── */}
        <div style={{ position:'relative', padding:'8px 16px 20px', background:'#ffffff', borderBottom:'1px solid #E2E8F0', overflow:'hidden' }}>
          <DecorativeDots />
          <div style={{ position:'relative', zIndex:1 }}>
            <p style={{ fontSize:'12px', fontWeight:500, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>
              {formatDayFull(today)}
            </p>
            <h1 style={{ fontSize:'28px', fontWeight:700, color:'#0F172A', letterSpacing:'-0.5px', marginBottom:'4px' }}>
              Bonjour {pseudo} !
            </h1>
            <p style={{ fontSize:'14px', color:'#64748B', marginBottom:'20px' }}>
              {todayRdvs.length === 0 ? 'Aucune visite planifiée aujourd\'hui'
                : `${todayRdvs.length} visite${todayRdvs.length > 1 ? 's' : ''} aujourd'hui`}
            </p>

            {/* KPI badges */}
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'12px' }}>
              {[
                { icon:'📅', value:`${aVenir} à venir`,       color:'#0F172A' },
                { icon:'📈', value:`${effectues} effectuées`, color:'#0F172A' },
                { icon:'👥', value:`${patients.length} patients`, color:'#0F172A' },
                // weather pill rendered separately below for click handling
              ].map((kpi, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:'8px',
                  padding:'8px 16px', background:'#F8FAFC',
                  border:'1px solid #E2E8F0', borderRadius:'999px',
                  fontSize:'13px', fontWeight:400, color: kpi.color,
                  boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  <span style={{ fontSize:'14px' }}>{kpi.icon}</span>
                  <span>{kpi.value}</span>
                </div>
              ))}
              {/* Météo cliquable */}
              {weather && (
                <div onClick={() => setShowForecast(!showForecast)}
                  style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', background: showForecast ? '#EFF6FF' : '#F8FAFC', border:`1px solid ${showForecast ? '#BFDBFE' : '#E2E8F0'}`, borderRadius:'999px', fontSize:'13px', fontWeight:400, color:'#0F172A', boxShadow:'0 1px 2px rgba(0,0,0,0.04)', cursor:'pointer', transition:'all 0.15s', userSelect:'none' }}>
                  <span style={{ fontSize:'16px' }}>{weather.icon}</span>
                  <span>{weather.temp}°C {weather.desc}</span>
                  <span style={{ fontSize:'10px', color:'#94A3B8', marginLeft:'2px' }}>{showForecast ? '▲' : '▼'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prévisions 7 jours */}
          {showForecast && forecast.length > 0 && (
            <div style={{ marginTop:'12px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {forecast.map((f, i) => (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'10px 12px', background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'14px', minWidth:'90px', boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }}>
                  <span style={{ fontSize:'11px', fontWeight:700, color:'#0F172A', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'2px' }}>{f.day}</span>
                  {/* Matin */}
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', width:'100%', padding:'4px 6px', background:'#FFF7ED', borderRadius:'8px' }}>
                    <span style={{ fontSize:'16px' }}>{f.iconAM}</span>
                    <div>
                      <div style={{ fontSize:'9px', color:'#94A3B8', fontWeight:600 }}>MATIN</div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#0F172A' }}>{f.tempAM}°</div>
                    </div>
                  </div>
                  {/* Après-midi */}
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', width:'100%', padding:'4px 6px', background:'#EFF6FF', borderRadius:'8px', marginTop:'3px' }}>
                    <span style={{ fontSize:'16px' }}>{f.iconPM}</span>
                    <div>
                      <div style={{ fontSize:'9px', color:'#94A3B8', fontWeight:600 }}>APM</div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#0F172A' }}>{f.tempPM}°</div>
                    </div>
                  </div>
                  {/* Min/Max */}
                  <div style={{ display:'flex', gap:'4px', fontSize:'11px', fontWeight:600, marginTop:'2px' }}>
                    <span style={{ color:'#2563EB' }}>{f.max}°</span>
                    <span style={{ color:'#94A3B8' }}>{f.min}°</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ padding:'16px', maxWidth:'1280px', margin:'0 auto' }}>

          {/* Quick action cards — 2 columns */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'12px', marginBottom:'20px' }}>
            {quickCards.map(card => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href} style={{ textDecoration:'none' }}>
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'20px 24px', background:'#ffffff',
                    border:'1px solid #E2E8F0', borderRadius:'16px',
                    boxShadow:'0 4px 12px rgba(15,23,42,0.04)',
                    cursor:'pointer', transition:'all 0.15s',
                    position:'relative', overflow:'hidden',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 24px rgba(15,23,42,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(15,23,42,0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                      <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:card.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 12px ${card.bg}40` }}>
                        <Icon style={{ width:'22px', height:'22px', color:'#ffffff' }} />
                      </div>
                      <div>
                        <p style={{ fontSize:'15px', fontWeight:600, color:'#0F172A', marginBottom:'2px' }}>{card.label}</p>
                        <p style={{ fontSize:'13px', color:'#64748B' }}>{card.sub}</p>
                      </div>
                    </div>
                    <ChevronRight style={{ width:'20px', height:'20px', color:'#CBD5E1', flexShrink:0 }} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Today's visits */}
          <div style={{ background:'#ffffff', border:'1px solid #E2E8F0', borderRadius:'16px', boxShadow:'0 4px 12px rgba(15,23,42,0.04)', overflow:'hidden', marginBottom:'16px' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid #F1F5F9' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <Clock style={{ width:'18px', height:'18px', color:'#2563EB' }} />
                <span style={{ fontSize:'16px', fontWeight:600, color:'#0F172A' }}>Visites d'aujourd'hui</span>
              </div>
              <Link href="/tournees" style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'14px', fontWeight:500, color:'#2563EB', textDecoration:'none' }}>
                Voir tournée <ChevronRight style={{ width:'16px', height:'16px' }} />
              </Link>
            </div>

            {/* List */}
            {loading ? (
              <div style={{ padding:'16px' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'12px', padding:'12px', background:'#F8FAFC', borderRadius:'12px' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ height:'13px', width:'50%', background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite', borderRadius:'6px', marginBottom:'6px' }} />
                      <div style={{ height:'11px', width:'70%', background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite', borderRadius:'6px' }} />
                    </div>
                  </div>
                ))}
                <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              </div>
            ) : todayRdvs.length === 0 ? (
              <div style={{ padding:'48px 24px', textAlign:'center' }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <Calendar style={{ width:'22px', height:'22px', color:'#CBD5E1' }} />
                </div>
                <p style={{ fontSize:'14px', color:'#94A3B8', marginBottom:'8px' }}>Aucune visite planifiée</p>
                <Link href="/planning" style={{ fontSize:'13px', color:'#2563EB', fontWeight:500, textDecoration:'none' }}>+ Planifier une visite</Link>
              </div>
            ) : (
              <div>
                {todayRdvs.map((rdv, i) => {
                  const isOcc = !rdv.patient_id;
                  const nom = isOcc
                    ? rdv.notes?.match(/\[Occasionnel\] ([^\n·]+)/)?.[1]?.trim() ?? 'Passage rapide'
                    : `${rdv.patient?.prenom ?? ''} ${rdv.patient?.nom ?? ''}`.trim();
                  const ville = rdv.patient?.ville ?? '';
                  const color = VISIT_COLORS[i % VISIT_COLORS.length];
                  const statutLabel: Record<string,string> = { planifie:'Planifiée', effectue:'Effectuée', reporte:'Reportée', annule:'Annulée' };
                  const statutBg: Record<string,string> = { planifie:'#EFF6FF', effectue:'#F0FDF4', reporte:'#FFFBEB', annule:'#FEF2F2' };
                  const statutColor: Record<string,string> = { planifie:'#2563EB', effectue:'#059669', reporte:'#D97706', annule:'#DC2626' };
                  return (
                    <div key={rdv.id} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'0 24px', height:'64px', borderBottom:'1px solid #F1F5F9' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Number circle */}
                      <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:'13px', fontWeight:600, color:'#ffffff' }}>{i+1}</span>
                      </div>
                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'14px', fontWeight:600, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nom}</p>
                        <p style={{ fontSize:'13px', color:'#64748B' }}>{rdv.heure_debut} — {rdv.heure_fin}{ville ? ` · ${ville}` : ''}</p>
                      </div>
                      {/* Status badge */}
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
                        <span style={{ padding:'4px 12px', borderRadius:'999px', background: statutBg[rdv.statut]??'#F1F5F9', color: statutColor[rdv.statut]??'#64748B', fontSize:'12px', fontWeight:500 }}>
                          {statutLabel[rdv.statut] ?? rdv.statut}
                        </span>
                        <MoreVertical style={{ width:'16px', height:'16px', color:'#CBD5E1', cursor:'pointer' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Security banner */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'20px 24px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'16px' }}>
            <Shield style={{ width:'20px', height:'20px', color:'#10B981', flexShrink:0 }} />
            <div>
              <p style={{ fontSize:'14px', fontWeight:600, color:'#0F172A', marginBottom:'2px' }}>Données sécurisées</p>
              <p style={{ fontSize:'13px', color:'#64748B' }}>Vos données patients sont chiffrées et isolées — seul votre compte y a accès.</p>
            </div>
            <div style={{ marginLeft:'auto', flexShrink:0, opacity:0.15 }}>
              <Shield style={{ width:'40px', height:'40px', color:'#64748B' }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AppShell>
  );
}
