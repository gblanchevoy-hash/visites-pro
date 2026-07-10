'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { supabase } from '@/lib/supabase/client';
import { UserSettings } from '@/types';
import toast from 'react-hot-toast';
import { Key, Clock, Loader2, CheckCircle2, User, Shield, Save, CreditCard, AlertTriangle } from 'lucide-react';

const S = {
  page: { flex:1, background:'#F8FAFC', overflow:'auto' as const, padding:'16px' },
  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:'16px', boxShadow:'0 4px 12px rgba(15,23,42,0.04)', padding:'24px', marginBottom:'16px' },
  cardHeader: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', paddingBottom:'16px', borderBottom:'1px solid #F1F5F9' },
  iconBox: (bg:string) => ({ width:'40px',height:'40px',borderRadius:'12px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 as const }),
  label: { display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'6px' },
  input: { width:'100%',padding:'11px 14px',background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'14px',color:'#0F172A',outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const },
  title: { fontSize:'15px',fontWeight:600,color:'#0F172A' },
  sub:   { fontSize:'12px',color:'#94A3B8',marginTop:'2px' },
};

export default function SettingsPage() {
  const { user, settings, setSettings } = useAppStore();
  const [pseudonyme, setPseudo]     = useState('');
  const [bareme, setBareme]         = useState('0.62');
  const [dureeVisite, setDuree]     = useState('30');
  const [heureDebut, setHeureDebut] = useState('08:00');
  const [heureFin, setHeureFin]     = useState('19:00');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!settings) return;
    // ORS key managed server-side only
    setPseudo(settings.pseudonyme ?? '');
    setBareme(settings.bareme_km?.toString() ?? '0.62');
    setDuree(settings.duree_visite_defaut?.toString() ?? '30');
    setHeureDebut(settings.heure_debut_journee ?? '08:00');
    setHeureFin(settings.heure_fin_journee ?? '19:00');
  }, [settings]);

;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { user_id:user.id, ors_api_key:settings?.ors_api_key??'', pseudonyme:pseudonyme.trim(), bareme_km:parseFloat(bareme), duree_visite_defaut:parseInt(dureeVisite), heure_debut_journee:heureDebut, heure_fin_journee:heureFin, adresse_depart:settings?.adresse_depart??'', adresse_depart_lat:settings?.adresse_depart_lat??null, adresse_depart_lng:settings?.adresse_depart_lng??null, categories:settings?.categories??[], couleurs_categories:settings?.couleurs_categories??{}, theme:'light' };
    if (settings?.id) {
      const { data, error } = await supabase.from('user_settings').update(payload).eq('id',settings.id).select().single();
      if (error) { toast.error('Erreur sauvegarde'); setSaving(false); return; }
      setSettings(data as UserSettings);
    } else {
      const { data, error } = await supabase.from('user_settings').insert(payload).select().single();
      if (error) { toast.error('Erreur création'); setSaving(false); return; }
      setSettings(data as UserSettings);
    }
    toast.success('Paramètres enregistrés !');
    setSaving(false);
  };

  return (
    <AppShell>
      <Topbar title="Paramètres" subtitle="Configuration de votre compte" />
      <div style={S.page}>
        <div style={{ maxWidth:'560px' }}>

          {/* Profil */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.iconBox('#EEF2FF')}><User style={{ width:'18px', height:'18px', color:'#6366F1' }} /></div>
              <div><p style={S.title}>Profil</p><p style={S.sub}>Votre prénom ou pseudonyme affiché dans l'application</p></div>
            </div>
            <label style={S.label}>Prénom / Pseudonyme</label>
            <input style={S.input} placeholder="Ex : Sophie, Dr Martin…" value={pseudonyme} onChange={e => setPseudo(e.target.value)} />
          </div>

          {/* ORS Key — gérée en backend, non visible */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.iconBox('#FFF7ED')}><Key style={{ width:'18px', height:'18px', color:'#F97316' }} /></div>
              <div><p style={S.title}>Calcul d'itinéraires</p><p style={S.sub}>OpenRouteService — configuration backend</p></div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'10px' }}>
              <CheckCircle2 style={{ width:'18px', height:'18px', color:'#10B981', flexShrink:0 }} />
              <div>
                <p style={{ fontSize:'13px', fontWeight:600, color:'#065F46' }}>Clé API active</p>
                <p style={{ fontSize:'12px', color:'#6EE7B7', marginTop:'2px' }}>Le calcul d'itinéraires est opérationnel. La clé est sécurisée côté serveur.</p>
              </div>
            </div>
          </div>

          {/* Barème & durée */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.iconBox('#ECFDF5')}><span style={{ fontSize:'16px', color:'#10B981', fontWeight:700 }}>€</span></div>
              <div><p style={S.title}>Kilomètres & visites</p><p style={S.sub}>Barème kilométrique et durée par défaut</p></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div>
                <label style={S.label}>Barème km (€/km)</label>
                <input type="number" step="0.001" min="0" style={S.input} value={bareme} onChange={e => setBareme(e.target.value)} />
                <p style={{ fontSize:'11px', color:'#94A3B8', marginTop:'4px' }}>URSSAF 2024 : 0,620 €/km</p>
              </div>
              <div>
                <label style={S.label}>Durée visite défaut (min)</label>
                <input type="number" step="5" min="5" style={S.input} value={dureeVisite} onChange={e => setDuree(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.iconBox('#EEF2FF')}><Clock style={{ width:'18px', height:'18px', color:'#6366F1' }} /></div>
              <div><p style={S.title}>Horaires de journée</p><p style={S.sub}>Plage horaire pour l'affichage du planning</p></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div>
                <label style={S.label}>Début de journée</label>
                <input type="time" style={S.input} value={heureDebut} onChange={e => setHeureDebut(e.target.value)} />
              </div>
              <div>
                <label style={S.label}>Fin de journée</label>
                <input type="time" style={S.input} value={heureFin} onChange={e => setHeureFin(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Security */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'16px 20px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'12px', marginBottom:'20px' }}>
            <Shield style={{ width:'18px', height:'18px', color:'#10B981', flexShrink:0, marginTop:'2px' }} />
            <p style={{ fontSize:'12px', color:'#64748B', lineHeight:1.6 }}>Vos paramètres sont chiffrés et protégés par les règles de sécurité Supabase. Seul votre compte y a accès.</p>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'14px', background:'#2563EB', color:'#fff', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(37,99,235,0.3)' }}>
            {saving ? <><Loader2 style={{ width:'18px', height:'18px', animation:'spin 0.8s linear infinite' }} /> Enregistrement…</> : <><Save style={{ width:'18px', height:'18px' }} /> Enregistrer les paramètres</>}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );
}
