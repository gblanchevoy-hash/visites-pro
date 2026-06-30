'use client';
import { useState } from 'react';
import { Patient } from '@/types';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { geocodeFullAdresse } from '@/lib/utils/geo';
import toast from 'react-hot-toast';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';
import { X, MapPin, Loader2 } from 'lucide-react';

const FREQUENCES = ['quotidien', 'bihebdomadaire', 'hebdomadaire', 'bimensuel', 'mensuel', 'autre'];
const COULEURS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

interface Props {
  patient: Patient | null;
  onClose: () => void;
}

export default function PatientModal({ patient, onClose }: Props) {
  const { user, addPatient, updatePatient , pushHistory } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState({
    nom: patient?.nom ?? '',
    prenom: patient?.prenom ?? '',
    adresse: patient?.adresse ?? '',
    code_postal: patient?.code_postal ?? '',
    ville: patient?.ville ?? '',
    telephone: patient?.telephone ?? '',
    email: patient?.email ?? '',
    notes: patient?.notes ?? '',
    frequence_visite: patient?.frequence_visite ?? '',
    categorie: patient?.categorie ?? '',
    couleur: patient?.couleur ?? '#6366f1',
    lat: patient?.lat ?? undefined as number | undefined,
    lng: patient?.lng ?? undefined as number | undefined,
    actif: true,
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleGeocode = async () => {
    if (!form.adresse || !form.ville) { toast.error('Saisissez adresse et ville'); return; }
    setGeocoding(true);
    const result = await geocodeFullAdresse(`${form.adresse}, ${form.code_postal} ${form.ville}`);
    if (result) {
      setForm((f) => ({ ...f, lat: result.lat, lng: result.lng }));
      toast.success('Adresse géolocalisée !');
    } else {
      toast.error('Impossible de géolocaliser cette adresse');
    }
    setGeocoding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Auto-geocode if coords missing
    if (!form.lat && form.adresse && form.ville) {
      const r = await geocodeFullAdresse(`${form.adresse}, ${form.code_postal} ${form.ville}`);
      if (r) setForm((f) => ({ ...f, lat: r.lat, lng: r.lng }));
    }

    const payload = { ...form, user_id: user.id };

    if (patient) {
      const { data, error } = await supabase.from('patients').update(payload).eq('id', patient.id).select().single();
      if (error) { toast.error('Erreur mise à jour'); setLoading(false); return; }
      const updated = data as Patient;
      updatePatient(updated);
      pushHistory({ type: 'UPDATE_PATIENT', before: patient, after: updated });
      toast.success('Patient mis à jour');
    } else {
      const { data, error } = await supabase.from('patients').insert(payload).select().single();
      if (error) { toast.error('Erreur création'); setLoading(false); return; }
      const newP = data as Patient;
addPatient(newP);
pushHistory({ type: 'ADD_PATIENT', patient: newP });
      toast.success('Patient créé');
    }

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-semibold text-slate-900">{patient ? 'Modifier le patient' : 'Nouveau patient'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom / Prénom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" required value={form.prenom} onChange={(e) => set('prenom', e.target.value)} />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" required value={form.nom} onChange={(e) => set('nom', e.target.value)} />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label className="label">Adresse *</label>
            <AddressAutocomplete
              value={form.adresse}
              onChange={(v) => set('adresse', v)}
              onSelect={({ adresse, codePostal, ville, lat, lng }) => {
                set('adresse', adresse);
                set('code_postal', codePostal);
                set('ville', ville);
                set('lat', lat);
                set('lng', lng);
              }}
              placeholder="15 rue des Roses, Toulon…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code postal *</label>
              <input className="input" required placeholder="75001" value={form.code_postal} onChange={(e) => set('code_postal', e.target.value)} />
            </div>
            <div>
              <label className="label">Ville *</label>
              <input className="input" required placeholder="Paris" value={form.ville} onChange={(e) => set('ville', e.target.value)} />
            </div>
          </div>

          <button type="button" onClick={handleGeocode} disabled={geocoding}
            className="btn-secondary text-xs w-full justify-center">
            {geocoding ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Géolocalisation…</> : <><MapPin className="w-3.5 h-3.5" /> Géolocaliser l'adresse</>}
            {form.lat && <span className="text-emerald-600 ml-1">✓ {form.lat.toFixed(4)}, {form.lng?.toFixed(4)}</span>}
          </button>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input className="input" type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>

          {/* Métier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fréquence de visite</label>
              <select className="input" value={form.frequence_visite} onChange={(e) => set('frequence_visite', e.target.value)}>
                <option value="">-- Sélectionner --</option>
                {FREQUENCES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <input className="input" placeholder="ex: Kiné, Infirmier…" value={form.categorie} onChange={(e) => set('categorie', e.target.value)} />
            </div>
          </div>

          {/* Couleur */}
          <div>
            <label className="label">Couleur d'identification</label>
            <div className="flex gap-2 flex-wrap">
              {COULEURS.map((c) => (
                <button key={c} type="button"
                  onClick={() => set('couleur', c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: form.couleur === c ? '#1e1b4b' : 'transparent' }}
                />
              ))}
              <input type="color" className="w-7 h-7 rounded-full cursor-pointer border border-slate-200"
                value={form.couleur} onChange={(e) => set('couleur', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes libres</label>
            <textarea className="input resize-none" rows={3} placeholder="Informations complémentaires…"
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? 'Enregistrement…' : patient ? 'Mettre à jour' : 'Créer le patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
