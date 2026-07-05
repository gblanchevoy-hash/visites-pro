'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { UserSettings } from '@/types';
import toast from 'react-hot-toast';
import { Navigation, Loader2, CheckCircle2, AlertCircle, Clock, Save, Info } from 'lucide-react';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';

const S = {
  page: { flex:1, background:'#F8FAFC', overflow:'auto' as const, padding:'16px' },
  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:'16px', boxShadow:'0 4px 12px rgba(15,23,42,0.04)', padding:'24px', marginBottom:'16px' },
  hdr: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', paddingBottom:'16px', borderBottom:'1px solid #F1F5F9' },
  icon: (bg:string) => ({ width:'40px',height:'40px',borderRadius:'12px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 as const }),
  label: { display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'6px' } as React.CSSProperties,
  input: { width:'100%',padding:'11px 14px',background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'14px',color:'#0F172A',outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const },
  title: { fontSize:'15px',fontWeight:600,color:'#0F172A' } as React.CSSProperties,
  sub:   { fontSize:'12px',color:'#94A3B8',marginTop:'2px' } as React.CSSProperties,
};

import React from 'react';

export default function DepartPage() {
  const { user, settings, setSettings, pushHistory } = useAppStore();
  const [adresse, setAdresse]   = useState('');
  const [lat, setLat]           = useState<number|undefined>();
  const [lng, setLng]           = useState<number|undefined>();
  const [heureDebut, setHD]     = useState('08:00');
  const [heureFin, setHF]       = useState('19:00');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!settings) return;
    setAdresse(p => p || settings.adresse_depart || '');
    setLat(p => p ?? settings.adresse_depart_lat ?? undefined);
    setLng(p => p ?? settings.adresse_depart_lng ?? undefined);
    setHD(p => p !== '08:00' ? p : (settings.heure_debut_journee ?? '08:00'));
    setHF(p => p !== '19:00' ? p : (settings.heure_fin_journee ?? '19:00'));
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    if (!lat || !lng) { toast.error('Sélectionnez une adresse dans les suggestions'); return; }
    setSaving(true);
    const payload = { user_id:user.id, adresse_depart:adresse, adresse_depart_lat:lat, adresse_depart_lng:lng, ors_api_key:settings?.ors_api_key??'', bareme_km:settings?.bareme_km??0.62, duree_visite_defaut:settings?.duree_visite_defaut??30, heure_debut_journee:heureDebut, heure_fin_journee:heureFin, categories:settings?.categories??[], couleurs_categories:settings?.couleurs_categories??{}, theme:'light' };
    if (settings?.id) {
      const { data, error } = await supabase.from('user_settings').update(payload).eq('id',settings.id).select().single();
      if (error) { toast.error('Erreur sauvegarde'); setSaving(false); return; }
      pushHistory({ type:'UPDATE_SETTINGS', before:settings!, after:data as UserSettings });
      setSettings(data as UserSettings);
    } else {
      const { data, error } = await supabase.from('user_settings').insert(payload).select().single();
      if (error) { toast.error('Erreur création'); setSaving(false); return; }
      setSettings(data as UserSettings);
    }
    toast.success('Configuration enregistrée !');
    setSaving(false);
  };

  const isConfigured = !!lat && !!lng;

  return (
    <AppShell>
      <Topbar title="Mon départ" subtitle="Adresse et horaires de tournée" />
      <div style={S.page}>

        {/* Status banner */}
        <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'18px 22px', borderRadius:'14px', marginBottom:'24px', background: isConfigured ? 'linear-gradient(135deg,#059669,#10B981)' : 'linear-gradient(135deg,#475569,#64748B)', boxShadow: isConfigured ? '0 4px 16px rgba(16,185,129,0.25)' : '0 4px 16px rgba(71,85,105,0.2)' }}>
          <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            {isConfigured ? <CheckCircle2 style={{ width:'22px',height:'22px',color:'#fff' }} /> : <AlertCircle style={{ width:'22px',height:'22px',color:'rgba(255,255,255,0.6)' }} />}
          </div>
          <div>
            <p style={{ fontWeight:600, color:'#fff', fontSize:'14px' }}>{isConfigured ? 'Adresse de départ configurée ✓' : 'Adresse de départ requise'}</p>
            <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.75)', marginTop:'2px' }}>{isConfigured ? `${adresse} · ${heureDebut} → ${heureFin}` : 'Renseignez votre adresse ci-dessous'}</p>
          </div>
        </div>

        <div style={{ maxWidth:'560px' }}>

          {/* Adresse */}
          <div style={S.card}>
            <div style={S.hdr}>
              <div style={S.icon('#EFF6FF')}><Navigation style={{ width:'18px',height:'18px',color:'#2563EB' }} /></div>
              <div><p style={S.title}>Adresse de départ</p><p style={S.sub}>Votre cabinet, domicile ou point de départ habituel</p></div>
            </div>
            <label style={S.label}>Adresse</label>
            <AddressAutocomplete value={adresse}
              onChange={v => { setAdresse(v); setLat(undefined); setLng(undefined); }}
              onSelect={({ adresse:a, lat:lt, lng:lg }) => { setAdresse(a); setLat(lt); setLng(lg); }}
              placeholder="15 avenue de la Gare, 83600 Fréjus"
              className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#2563eb]" />
            <p style={{ fontSize:'11px', color:'#94A3B8', marginTop:'6px' }}>Tapez pour voir les suggestions — cliquez sur une pour la géolocaliser</p>
            {lat && lng && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'12px', padding:'10px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'10px' }}>
                <CheckCircle2 style={{ width:'15px',height:'15px',color:'#10B981',flexShrink:0 }} />
                <p style={{ fontSize:'12px', fontWeight:600, color:'#065F46' }}>Géolocalisé · {lat.toFixed(5)}, {lng.toFixed(5)}</p>
              </div>
            )}
          </div>

          {/* Horaires */}
          <div style={S.card}>
            <div style={S.hdr}>
              <div style={S.icon('#EEF2FF')}><Clock style={{ width:'18px',height:'18px',color:'#6366F1' }} /></div>
              <div><p style={S.title}>Horaires de tournée</p><p style={S.sub}>Début et fin de journée pour le calcul d'itinéraire</p></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'14px' }}>
              <div>
                <label style={S.label}>Départ de chez vous</label>
                <input type="time" style={S.input} value={heureDebut} onChange={e => setHD(e.target.value)} />
              </div>
              <div>
                <label style={S.label}>Retour à la base</label>
                <input type="time" style={S.input} value={heureFin} onChange={e => setHF(e.target.value)} />
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'12px 14px', background:'#EFF6FF', border:'1px solid #DBEAFE', borderRadius:'10px' }}>
              <Info style={{ width:'14px',height:'14px',color:'#2563EB',flexShrink:0,marginTop:'1px' }} />
              <p style={{ fontSize:'12px', color:'#1D4ED8', lineHeight:1.6 }}>Le calcul inclut automatiquement le trajet <strong>départ → 1ère visite</strong> et <strong>dernière visite → retour</strong>.</p>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !lat || !lng}
            style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',width:'100%',padding:'14px',background: (!lat||!lng) ? '#94A3B8' : '#2563EB',color:'#fff',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:600,cursor: (!lat||!lng) ? 'not-allowed' : 'pointer',boxShadow: (!lat||!lng) ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',marginBottom:'12px' }}>
            {saving ? <><Loader2 style={{ width:'18px',height:'18px',animation:'spin 0.8s linear infinite' }} /> Enregistrement…</> : <><Save style={{ width:'18px',height:'18px' }} /> Enregistrer</>}
          </button>

          <div style={{ display:'flex',alignItems:'flex-start',gap:'10px',padding:'14px 16px',background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:'12px' }}>
            <span style={{ fontSize:'14px' }}>🔒</span>
            <p style={{ fontSize:'12px', color:'#64748B', lineHeight:1.6 }}>Votre adresse est stockée de façon sécurisée, protégée par les règles Supabase. Elle n'est jamais partagée.</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );
}
