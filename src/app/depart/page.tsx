'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { UserSettings } from '@/types';
import toast from 'react-hot-toast';
import { Navigation, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';

export default function DepartPage() {
  const { user, settings, setSettings, pushHistory } = useAppStore();
  const [adresse, setAdresse] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [heureDebut, setHeureDebut] = useState('08:00');
  const [heureFin, setHeureFin] = useState('19:00');
  // Hydrate from settings or cache — never overwrite existing local values with empty ones
  useEffect(() => {
    if (!settings) return;
    setAdresse((prev) => prev || settings?.adresse_depart || '');
    setLat((prev) => prev ?? settings?.adresse_depart_lat ?? undefined);
    setLng((prev) => prev ?? settings?.adresse_depart_lng ?? undefined);

    setHeureDebut((prev) => prev !== '08:00' ? prev : (settings?.heure_debut_journee ?? '08:00'));
    setHeureFin((prev) => prev !== '19:00' ? prev : (settings?.heure_fin_journee ?? '19:00'));
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    if (!lat || !lng) { toast.error("Sélectionnez une adresse dans les suggestions"); return; }
    setSaving(true);
    const payload = {
      user_id: user.id,
      adresse_depart: adresse,
      adresse_depart_lat: lat,
      adresse_depart_lng: lng,
      ors_api_key: settings?.ors_api_key ?? '',
      bareme_km: settings?.bareme_km ?? 0.62,
      duree_visite_defaut: settings?.duree_visite_defaut ?? 30,
      heure_debut_journee: heureDebut,
      heure_fin_journee: heureFin,
      categories: settings?.categories ?? [],
      couleurs_categories: settings?.couleurs_categories ?? {},
      theme: 'light',
    };
    if (settings?.id) {
      const { data, error } = await supabase.from('user_settings').update(payload).eq('id', settings.id).select().single();
      if (error) { toast.error('Erreur sauvegarde'); setSaving(false); return; }
      pushHistory({ type: 'UPDATE_SETTINGS', before: settings!, after: data as UserSettings });
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
      <Topbar variant="road" title="Mon point de départ" subtitle="Adresse, horaires et itinéraires" />
      <div className="flex-1 p-4 lg:p-6 overflow-auto">

        {/* Status banner */}
        <div className={`mb-6 rounded-2xl p-5 flex items-center gap-4 ${isConfigured ? 'bg-gradient-to-r from-forest-600 to-forest-500' : 'bg-gradient-to-r from-slate-700 to-slate-600'}`}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 flex-shrink-0">
            {isConfigured ? <CheckCircle2 className="w-6 h-6 text-white" /> : <AlertCircle className="w-6 h-6 text-white/60" />}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{isConfigured ? 'Adresse de départ configurée ✓' : 'Adresse de départ requise'}</p>
            <p className="text-xs text-white/70 mt-0.5">
              {isConfigured ? `${adresse} · Départ ${heureDebut} · Fin ${heureFin}` : "Renseignez votre adresse de départ"}
            </p>
          </div>
        </div>

        <div className="max-w-xl space-y-5">

          {/* Adresse */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Adresse de départ</h2>
                <p className="text-xs text-slate-500">Votre cabinet, domicile ou point de départ habituel</p>
              </div>
            </div>
            <div>
              <label className="label">Adresse</label>
              <AddressAutocomplete
                value={adresse}
                onChange={(v) => { setAdresse(v); setLat(undefined); setLng(undefined); }}
                onSelect={({ adresse: a, lat: lt, lng: lg }) => { setAdresse(a); setLat(lt); setLng(lg); }}
                placeholder="15 avenue de la Gare, 83600 Fréjus"
              />
              <p className="text-xs text-slate-400 mt-1.5">Tapez pour voir les suggestions — cliquez sur une pour la géolocaliser automatiquement</p>
            </div>
            {lat && lng && (
              <div className="flex items-center gap-2 p-3 bg-forest-50 rounded-xl border border-forest-200">
                <CheckCircle2 className="w-4 h-4 text-forest-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-forest-700">Adresse géolocalisée · {lat.toFixed(5)}, {lng.toFixed(5)}</p>
              </div>
            )}
          </div>

          {/* Horaires journée */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Horaires de tournée</h2>
                <p className="text-xs text-slate-500">Début et fin de journée — utilisés pour le calcul du premier et dernier trajet</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Départ de chez vous</label>
                <input type="time" className="input" value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1">Heure à laquelle vous partez</p>
              </div>
              <div>
                <label className="label">Retour à la base</label>
                <input type="time" className="input" value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1">Heure d'arrivée de retour</p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-700">
                💡 Le calcul d'itinéraire inclura automatiquement le trajet <strong>départ → 1ère visite</strong> et <strong>dernière visite → retour</strong>.
              </p>
            </div>
          </div>

          {/* Barème km */}
          <div className="card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-road-50 flex items-center justify-center">
                <span className="text-road-600 font-bold text-sm">€</span>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Barème kilométrique</h2>
                <p className="text-xs text-slate-500">Indemnité par kilomètre parcouru</p>
              </div>
            </div>

          </div>

                    <button onClick={handleSave} disabled={saving || !lat || !lng}
            className="btn-road w-full justify-center py-3 text-base font-semibold">
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement…</> : <><CheckCircle2 className="w-5 h-5" /> Enregistrer ma configuration</>}
          </button>

          <div className="flex items-start gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-base">🔒</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              Votre adresse et clé API sont stockées de façon sécurisée sur votre base Supabase, protégées par les règles de sécurité (RLS). Elles ne sont jamais partagées.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
