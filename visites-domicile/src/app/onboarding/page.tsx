'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, Navigation, Calendar, MapPin, Sparkles, ArrowRight, User, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    id: 'bienvenue',
    icon: '👋',
    title: 'Bienvenue sur Itilib',
    subtitle: 'Votre outil de tournées à domicile',
  },
  {
    id: 'pseudo',
    icon: '👤',
    title: 'Comment vous appelle-t-on ?',
    subtitle: 'Un prénom ou pseudonyme pour personnaliser votre espace',
  },
  {
    id: 'depart',
    icon: '📍',
    title: 'Votre point de départ',
    subtitle: 'Adresse depuis laquelle vous commencez vos tournées',
  },
  {
    id: 'patient',
    icon: '🧑‍⚕️',
    title: 'Ajoutez votre premier patient',
    subtitle: 'Pour commencer à planifier vos visites',
  },
  {
    id: 'fin',
    icon: '🎉',
    title: 'Tout est prêt !',
    subtitle: 'Vous pouvez commencer à utiliser Itilib',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { loadSettings } = useAppStore();
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Étape pseudo
  const [pseudonyme, setPseudo] = useState('');

  // Étape départ
  const [adresseDepart, setAdresseDepart] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [departCoords, setDepartCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Étape patient
  const [patientNom, setPatientNom] = useState('');
  const [patientPrenom, setPatientPrenom] = useState('');
  const [patientAdresse, setPatientAdresse] = useState('');
  const [patientTel, setPatientTel] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return; }
      setUserId(data.session.user.id);
    });
  }, []);

  const progress = Math.round((stepIdx / (STEPS.length - 1)) * 100);
  const step = STEPS[stepIdx];

  // Geocoding pour l'adresse de départ
  const handleGeocodeSearch = async (q: string) => {
    setAdresseDepart(q);
    if (q.length < 3) { setGeocodeResults([]); return; }
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGeocodeResults(data.results?.slice(0, 4) ?? []);
    } catch { setGeocodeResults([]); }
    setGeocoding(false);
  };

  const savePseudo = async () => {
    if (!pseudonyme.trim() || !userId) return;
    setLoading(true);
    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      pseudonyme: pseudonyme.trim(),
      bareme_km: 0.62,
      duree_visite_defaut: 30,
      heure_debut_journee: '08:00',
      heure_fin_journee: '19:00',
      categories: [],
      couleurs_categories: {},
      theme: 'light',
    }, { onConflict: 'user_id' });
    if (error) { toast.error('Erreur'); setLoading(false); return; }
    setLoading(false);
    setStepIdx(s => s + 1);
  };

  const saveDepart = async () => {
    if (!departCoords || !userId) return;
    setLoading(true);
    const { error } = await supabase.from('user_settings').update({
      adresse_depart: departCoords.label,
      adresse_depart_lat: departCoords.lat,
      adresse_depart_lng: departCoords.lng,
    }).eq('user_id', userId);
    if (error) { toast.error('Erreur sauvegarde'); setLoading(false); return; }
    await loadSettings();
    setLoading(false);
    setStepIdx(s => s + 1);
  };

  const savePatient = async () => {
    if (!patientNom.trim() || !userId) return;
    setLoading(true);
    await supabase.from('patients').insert({
      user_id: userId,
      nom: patientNom.trim(),
      prenom: patientPrenom.trim(),
      adresse: patientAdresse.trim(),
      telephone: patientTel.trim(),
    });
    setLoading(false);
    setStepIdx(s => s + 1);
  };

  const S = {
    page: { minHeight:'100vh', background:'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 50%, #EFF6FF 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'Inter',-apple-system,sans-serif" },
    card: { width:'100%', maxWidth:'520px', background:'#FFFFFF', borderRadius:'28px', boxShadow:'0 24px 80px rgba(15,23,42,.10)', overflow:'hidden' },
    header: { background:'linear-gradient(135deg,#2563EB,#1D4ED8)', padding:'28px 32px 24px' },
    progress: { height:'4px', background:'rgba(255,255,255,.2)', borderRadius:'2px', marginBottom:'20px', overflow:'hidden' },
    progressBar: { height:'100%', background:'#FFFFFF', borderRadius:'2px', transition:'width .4s ease' },
    stepLabel: { fontSize:'12px', color:'rgba(255,255,255,.7)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' as const, marginBottom:'4px' },
    stepTitle: { fontSize:'22px', fontWeight:800, color:'#FFFFFF', letterSpacing:'-.5px' },
    stepSub: { fontSize:'14px', color:'rgba(255,255,255,.75)', marginTop:'4px' },
    body: { padding:'32px' },
    input: { width:'100%', height:'52px', borderRadius:'14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', padding:'0 16px', fontSize:'15px', fontFamily:'inherit', color:'#0F172A', outline:'none' },
    label: { display:'block' as const, fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'7px' },
    btn: (disabled=false) => ({ width:'100%', height:'52px', borderRadius:'14px', background: disabled ? '#CBD5E1' : 'linear-gradient(175deg,#2563EB,#1D4ED8)', border:'none', color:'#FFFFFF', fontSize:'15px', fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontFamily:'inherit', marginTop:'20px', transition:'all .2s' }),
    skip: { background:'none', border:'none', color:'#94A3B8', fontSize:'14px', cursor:'pointer', marginTop:'12px', width:'100%', textAlign:'center' as const, fontFamily:'inherit' },
    geocodeItem: { padding:'12px 14px', borderRadius:'10px', background:'#F8FAFC', border:'1px solid #E2E8F0', cursor:'pointer', marginBottom:'6px', fontSize:'13px', color:'#374151', transition:'all .15s' },
    featureCard: { display:'flex', alignItems:'flex-start', gap:'14px', padding:'14px 16px', background:'#F8FAFC', borderRadius:'12px', marginBottom:'10px' },
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.progress}>
            <div style={{ ...S.progressBar, width:`${progress}%` }} />
          </div>
          <div style={S.stepLabel}>Étape {stepIdx + 1} sur {STEPS.length}</div>
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>{step.icon}</div>
          <div style={S.stepTitle}>{step.title}</div>
          <div style={S.stepSub}>{step.subtitle}</div>
        </div>

        <div style={S.body}>

          {/* Étape 0 — Bienvenue */}
          {stepIdx === 0 && (
            <>
              <p style={{ fontSize:'15px', color:'#475569', lineHeight:1.7, marginBottom:'24px' }}>
                Itilib va vous aider à <strong>planifier vos tournées</strong>, calculer vos <strong>itinéraires optimisés</strong> et générer vos <strong>rapports kilométriques</strong> automatiquement.
              </p>
              <div style={{ marginBottom:'8px' }}>
                {[
                  { icon:'📍', text:'Itinéraires optimisés avec trafic réel' },
                  { icon:'📅', text:'Planning semaine et mois' },
                  { icon:'📊', text:'Rapport fiscal annuel automatique' },
                  { icon:'🌤️', text:'Météo du matin et de l\'après-midi' },
                ].map(f => (
                  <div key={f.text} style={S.featureCard}>
                    <span style={{ fontSize:'20px', flexShrink:0 }}>{f.icon}</span>
                    <span style={{ fontSize:'14px', color:'#374151', fontWeight:500 }}>{f.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setStepIdx(1)} style={S.btn()}>
                Commencer la configuration <ArrowRight style={{ width:'16px', height:'16px' }} />
              </button>
              <p style={{ fontSize:'12px', color:'#94A3B8', textAlign:'center', marginTop:'12px' }}>
                ⏱️ 3 minutes pour tout configurer
              </p>
            </>
          )}

          {/* Étape 1 — Pseudo */}
          {stepIdx === 1 && (
            <>
              <div style={{ marginBottom:'20px' }}>
                <label style={S.label}>Votre prénom ou pseudonyme</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}>
                    <User style={{ width:'17px', height:'17px' }} />
                  </span>
                  <input
                    style={{ ...S.input, paddingLeft:'44px' }}
                    placeholder="Ex : Sophie, Dr Martin, Infirmière Dupont…"
                    value={pseudonyme}
                    onChange={e => setPseudo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && pseudonyme.trim() && savePseudo()}
                    autoFocus
                  />
                </div>
                <p style={{ fontSize:'12px', color:'#94A3B8', marginTop:'8px' }}>
                  Ce nom s'affichera dans l'application. Vous pourrez le modifier dans les paramètres.
                </p>
              </div>
              <button onClick={savePseudo} disabled={!pseudonyme.trim() || loading} style={S.btn(!pseudonyme.trim() || loading)}>
                {loading ? <Loader2 style={{ width:'16px', height:'16px', animation:'spin .8s linear infinite' }} /> : <><span>Continuer</span><ArrowRight style={{ width:'16px', height:'16px' }} /></>}
              </button>
              <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
            </>
          )}

          {/* Étape 2 — Adresse départ */}
          {stepIdx === 2 && (
            <>
              <div style={{ marginBottom:'16px' }}>
                <label style={S.label}>Adresse de départ</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}>
                    <Navigation style={{ width:'17px', height:'17px' }} />
                  </span>
                  <input
                    style={{ ...S.input, paddingLeft:'44px' }}
                    placeholder="Ex : 15 rue de la Paix, 83000 Toulon"
                    value={adresseDepart}
                    onChange={e => handleGeocodeSearch(e.target.value)}
                    autoFocus
                  />
                  {geocoding && <Loader2 style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', width:'16px', height:'16px', color:'#94A3B8', animation:'spin .8s linear infinite' }} />}
                </div>
              </div>

              {/* Résultats geocoding */}
              {geocodeResults.length > 0 && !departCoords && (
                <div style={{ marginBottom:'16px' }}>
                  {geocodeResults.map((r, i) => (
                    <div key={i} style={S.geocodeItem}
                      onClick={() => { setDepartCoords({ lat: r.lat, lng: r.lng, label: r.label }); setAdresseDepart(r.label); setGeocodeResults([]); }}>
                      <MapPin style={{ display:'inline', width:'13px', height:'13px', marginRight:'6px', color:'#2563EB' }} />
                      {r.label}
                    </div>
                  ))}
                </div>
              )}

              {/* Adresse sélectionnée */}
              {departCoords && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'12px', marginBottom:'16px' }}>
                  <CheckCircle2 style={{ width:'18px', height:'18px', color:'#10B981', flexShrink:0 }} />
                  <span style={{ fontSize:'13px', color:'#065F46', fontWeight:500 }}>{departCoords.label}</span>
                </div>
              )}

              <button onClick={saveDepart} disabled={!departCoords || loading} style={S.btn(!departCoords || loading)}>
                {loading ? <Loader2 style={{ width:'16px', height:'16px', animation:'spin .8s linear infinite' }} /> : <><span>Enregistrer et continuer</span><ArrowRight style={{ width:'16px', height:'16px' }} /></>}
              </button>
              <button style={S.skip} onClick={() => setStepIdx(s => s + 1)}>
                Passer cette étape →
              </button>
            </>
          )}

          {/* Étape 3 — Premier patient */}
          {stepIdx === 3 && (
            <>
              <p style={{ fontSize:'14px', color:'#64748B', marginBottom:'20px' }}>
                Ajoutez un premier patient pour découvrir toutes les fonctionnalités.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                <div>
                  <label style={S.label}>Nom *</label>
                  <input style={S.input} placeholder="Dupont" value={patientNom} onChange={e => setPatientNom(e.target.value)} autoFocus />
                </div>
                <div>
                  <label style={S.label}>Prénom</label>
                  <input style={S.input} placeholder="Jean" value={patientPrenom} onChange={e => setPatientPrenom(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom:'10px' }}>
                <label style={S.label}>Adresse</label>
                <input style={S.input} placeholder="15 rue de la Paix, 83000 Toulon" value={patientAdresse} onChange={e => setPatientAdresse(e.target.value)} />
              </div>
              <div style={{ marginBottom:'4px' }}>
                <label style={S.label}>Téléphone</label>
                <input style={S.input} placeholder="06 00 00 00 00" value={patientTel} onChange={e => setPatientTel(e.target.value)} />
              </div>
              <button onClick={savePatient} disabled={!patientNom.trim() || loading} style={S.btn(!patientNom.trim() || loading)}>
                {loading ? <Loader2 style={{ width:'16px', height:'16px', animation:'spin .8s linear infinite' }} /> : <><span>Ajouter et continuer</span><ArrowRight style={{ width:'16px', height:'16px' }} /></>}
              </button>
              <button style={S.skip} onClick={() => setStepIdx(s => s + 1)}>
                Passer cette étape →
              </button>
            </>
          )}

          {/* Étape 4 — Fin */}
          {stepIdx === 4 && (
            <>
              <div style={{ textAlign:'center', marginBottom:'28px' }}>
                <div style={{ fontSize:'56px', marginBottom:'12px' }}>🎉</div>
                <p style={{ fontSize:'15px', color:'#475569', lineHeight:1.7 }}>
                  Votre espace est configuré. Vous disposez de <strong>30 jours d'essai gratuit</strong> pour découvrir toutes les fonctionnalités.
                </p>
              </div>

              <div style={{ marginBottom:'8px' }}>
                {[
                  { icon:<Navigation style={{ width:'16px', height:'16px', color:'#2563EB' }} />, label:'Configurer mon départ', link:'/depart', color:'#EFF6FF' },
                  { icon:<MapPin style={{ width:'16px', height:'16px', color:'#10B981' }} />, label:'Voir mes patients', link:'/patients', color:'#F0FDF4' },
                  { icon:<Calendar style={{ width:'16px', height:'16px', color:'#F59E0B' }} />, label:'Ouvrir le planning', link:'/planning', color:'#FFFBEB' },
                  { icon:<Sparkles style={{ width:'16px', height:'16px', color:'#7C3AED' }} />, label:'Calculer ma première tournée', link:'/tournees', color:'#F5F3FF' },
                ].map(item => (
                  <a key={item.link} href={item.link} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:item.color, borderRadius:'12px', marginBottom:'8px', textDecoration:'none', color:'#0F172A' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      {item.icon}
                      <span style={{ fontSize:'14px', fontWeight:600 }}>{item.label}</span>
                    </div>
                    <ChevronRight style={{ width:'16px', height:'16px', color:'#94A3B8' }} />
                  </a>
                ))}
              </div>

              <button onClick={async () => {
                await loadSettings();
                router.replace('/dashboard');
              }} style={S.btn()}>
                Accéder au tableau de bord <ArrowRight style={{ width:'16px', height:'16px' }} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
