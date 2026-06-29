'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { UserSettings } from '@/types';
import toast from 'react-hot-toast';
import { Key, Clock, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, settings, setSettings, setCachedOrsKey } = useAppStore();
  const [orsKey, setOrsKey]       = useState('');
  const [showKey, setShowKey]     = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyValid, setKeyValid]   = useState<boolean | null>(null);
  const [pseudonyme, setPseudo]   = useState('');
  const [bareme, setBareme]       = useState('0.62');
  const [dureeVisite, setDuree]   = useState('30');
  const [heureDebut, setHeureDebut] = useState('08:00');
  const [heureFin, setHeureFin]   = useState('19:00');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!settings) return;
    setOrsKey(settings.ors_api_key ?? '');
    setPseudo(settings.pseudonyme ?? '');
    setBareme(settings.bareme_km?.toString() ?? '0.62');
    setDuree(settings.duree_visite_defaut?.toString() ?? '30');
    setHeureDebut(settings.heure_debut_journee ?? '08:00');
    setHeureFin(settings.heure_fin_journee ?? '19:00');
  }, [settings]);

  const handleTestKey = async () => {
    if (!orsKey.trim()) return;
    setTestingKey(true);
    try {
      const res = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=2.3522,48.8566&end=2.3488,48.8534`);
      setKeyValid(res.ok);
      if (res.ok) toast.success('Clé API valide !');
      else toast.error('Clé API invalide');
    } catch { setKeyValid(false); toast.error('Impossible de tester'); }
    setTestingKey(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      ors_api_key: orsKey,
      pseudonyme: pseudonyme.trim(),
      bareme_km: parseFloat(bareme),
      duree_visite_defaut: parseInt(dureeVisite),
      heure_debut_journee: heureDebut,
      heure_fin_journee: heureFin,
      adresse_depart: settings?.adresse_depart ?? '',
      adresse_depart_lat: settings?.adresse_depart_lat ?? null,
      adresse_depart_lng: settings?.adresse_depart_lng ?? null,
      categories: settings?.categories ?? [],
      couleurs_categories: settings?.couleurs_categories ?? {},
      theme: 'light',
    };
    if (settings?.id) {
      const { data, error } = await supabase.from('user_settings').update(payload).eq('id', settings.id).select().single();
      if (error) { toast.error('Erreur sauvegarde'); setSaving(false); return; }
      setSettings(data as UserSettings);
    } else {
      const { data, error } = await supabase.from('user_settings').insert(payload).select().single();
      if (error) { toast.error('Erreur création'); setSaving(false); return; }
      setSettings(data as UserSettings);
    }
    if (orsKey) setCachedOrsKey(orsKey);
    toast.success('Paramètres enregistrés !');
    setSaving(false);
  };

  return (
    <AppShell>
      <Topbar title="Paramètres" subtitle="Configuration de votre compte" />
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-xl space-y-5">

          {/* Pseudonyme */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <User className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Profil</h2>
                <p className="text-xs text-slate-500">Votre prénom ou pseudonyme affiché dans l'application</p>
              </div>
            </div>
            <div>
              <label className="label">Prénom / Pseudonyme</label>
              <input className="input" placeholder="Ex : Sophie, Dr Martin…"
                value={pseudonyme} onChange={e => setPseudo(e.target.value)} />
            </div>
          </div>

          {/* ORS API Key */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-road-50 flex items-center justify-center">
                <Key className="w-5 h-5 text-road-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Clé API OpenRouteService</h2>
                <p className="text-xs text-slate-500">Pour le calcul d'itinéraires et temps de trajet</p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 space-y-1">
              <p className="font-semibold text-blue-800">Comment obtenir votre clé gratuite :</p>
              <ol className="space-y-0.5 list-decimal list-inside">
                <li>Allez sur <a href="https://openrouteservice.org" target="_blank" rel="noreferrer" className="underline font-medium">openrouteservice.org</a></li>
                <li>Cliquez "Get started" → créez un compte gratuit</li>
                <li>Dans votre tableau de bord, copiez votre clé API</li>
              </ol>
              <p className="text-blue-600">Plan gratuit : 2 000 itinéraires/jour.</p>
            </div>
            <div>
              <label className="label">Votre clé API</label>
              <div className="relative">
                <input type={showKey ? 'text' : 'password'} className="input pr-10"
                  placeholder="5b3ce3597851110001cf6249…" value={orsKey}
                  onChange={e => { setOrsKey(e.target.value); setKeyValid(null); }} />
                <button type="button" onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={handleTestKey} disabled={testingKey || !orsKey.trim()} className="btn-secondary w-full justify-center">
              {testingKey ? <><Loader2 className="w-4 h-4 animate-spin" /> Test…</>
                : keyValid === true ? <><CheckCircle2 className="w-4 h-4 text-forest-600" /> Clé valide ✓</>
                : keyValid === false ? <><AlertCircle className="w-4 h-4 text-red-500" /> Invalide — réessayer</>
                : '🔑 Tester la clé'}
            </button>
          </div>

          {/* Barème & durée */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-road-50 flex items-center justify-center">
                <span className="text-road-600 font-bold">€</span>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Kilomètres & visites</h2>
                <p className="text-xs text-slate-500">Barème kilométrique et durée par défaut</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Barème km (€/km)</label>
                <input type="number" step="0.001" min="0" className="input"
                  value={bareme} onChange={e => setBareme(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1">URSSAF 2024 : 0,620 €/km</p>
              </div>
              <div>
                <label className="label">Durée visite défaut (min)</label>
                <input type="number" step="5" min="5" className="input"
                  value={dureeVisite} onChange={e => setDuree(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Horaires de journée</h2>
                <p className="text-xs text-slate-500">Plage horaire pour l'affichage du planning</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Début de journée</label>
                <input type="time" className="input" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} />
              </div>
              <div>
                <label className="label">Fin de journée</label>
                <input type="time" className="input" value={heureFin} onChange={e => setHeureFin(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Security info */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <Shield className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Vos paramètres sont chiffrés et stockés sur votre base Supabase, protégés par les règles de sécurité. Ils ne sont accessibles que par votre compte.
            </p>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-3 text-base font-semibold">
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement…</> : <><CheckCircle2 className="w-5 h-5" /> Enregistrer les paramètres</>}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
