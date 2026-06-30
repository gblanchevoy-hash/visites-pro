'use client';
import { useState } from 'react';
import { RendezVous } from '@/types';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { X, Trash2, Copy, UserPlus, Users } from 'lucide-react';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';
import { geocodeFullAdresse } from '@/lib/utils/geo';
import { addMinutes } from '@/lib/utils/dates';

interface Props {
  rdv: RendezVous | null;
  defaultDate: string;
  defaultTime?: string;
  onClose: () => void;
}

const STATUTS = [
  { value: 'planifie', label: 'Planifié' },
  { value: 'effectue', label: 'Effectué' },
  { value: 'reporte', label: 'Reporté' },
  { value: 'annule', label: 'Annulé' },
];

type Mode = 'patient' | 'occasionnel';

// Parse occasionnel info stored in notes: "[Occasionnel] Nom · Adresse · Tel\nNotes"
function parseOccasionnelNotes(notes: string) {
  const firstLine = notes.split('\n')[0] ?? '';
  // Remove "[Occasionnel] " prefix
  const body = firstLine.replace('[Occasionnel] ', '');
  const parts = body.split(' · ');
  return {
    nom: parts[0]?.trim() ?? '',
    adresse: parts[1]?.trim() ?? '',
    telephone: parts[2]?.trim() ?? '',
  };
}

function getUserNotes(notes: string) {
  const lines = notes.split('\n');
  return lines.slice(1).join('\n').trim();
}

export default function RdvModal({ rdv, defaultDate, defaultTime, onClose }: Props) {
  const { patients, user, addRendezVous, updateRendezVous, removeRendezVous, pushHistory } = useAppStore();

  // Detect if this is an existing occasionnel RDV
  const isExistingOccasionnel = !!rdv && !rdv.patient_id && !!rdv.notes && rdv.notes.startsWith('[Occasionnel]');
  const existingOcc = isExistingOccasionnel && rdv?.notes
    ? parseOccasionnelNotes(rdv.notes)
    : { nom: '', adresse: '', telephone: '' };
  const existingUserNotes = isExistingOccasionnel && rdv?.notes
    ? getUserNotes(rdv.notes)
    : (rdv?.notes ?? '');

  const [mode, setMode] = useState<Mode>(isExistingOccasionnel ? 'occasionnel' : 'patient');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    patient_id: rdv?.patient_id ?? '',
    date: rdv?.date ?? defaultDate,
    heure_debut: rdv?.heure_debut ?? defaultTime ?? '09:00',
    heure_fin: rdv?.heure_fin ?? (defaultTime ? addMinutes(defaultTime, 30) : '09:30'),
    duree_minutes: rdv?.duree_minutes ?? 30,
    statut: rdv?.statut ?? 'planifie',
    notes: existingUserNotes,
    couleur: rdv?.couleur ?? '',
  });
  const [occasionnel, setOccasionnel] = useState(existingOcc);
  const [customDuree, setCustomDuree] = useState(
    !!rdv && ![15,20,30,45,60,90,120].includes(rdv.duree_minutes)
  );
  const [occCoords, setOccCoords] = useState<{ lat: number; lng: number } | null>(
    isExistingOccasionnel && (rdv as unknown as {lat?: number; lng?: number})?.lat
      ? { lat: (rdv as unknown as {lat: number}).lat, lng: (rdv as unknown as {lng: number}).lng }
      : null
  );

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleDureeChange = (mins: number) => {
    set('duree_minutes', mins);
    set('heure_fin', addMinutes(form.heure_debut, mins));
  };

  const handleHeureDebut = (h: string) => {
    set('heure_debut', h);
    set('heure_fin', addMinutes(h, form.duree_minutes));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (mode === 'patient' && !form.patient_id) { toast.error('Sélectionnez un patient'); return; }
    if (mode === 'occasionnel' && !occasionnel.nom.trim()) { toast.error('Renseignez au moins un nom'); return; }

    setLoading(true);
    let payload: Record<string, unknown> = { ...form, user_id: user.id };

    if (mode === 'occasionnel') {
      const header = `[Occasionnel] ${occasionnel.nom}${occasionnel.adresse ? ' · ' + occasionnel.adresse : ''}${occasionnel.telephone ? ' · ' + occasionnel.telephone : ''}`;
      const fullNotes = form.notes.trim() ? `${header}\n${form.notes}` : header;
      // Géolocaliser l'adresse si pas encore fait
      let coords = occCoords;
      if (!coords && occasionnel.adresse.trim()) {
        try {
          const geo = await geocodeFullAdresse(occasionnel.adresse);
          if (geo) { coords = { lat: geo.lat, lng: geo.lng }; setOccCoords(coords); }
        } catch { /* ignore */ }
      }
      // ← Inclure lat/lng dans le payload
      payload = {
        ...payload,
        patient_id: null,
        notes: fullNotes,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      };
    }

    if (rdv) {
      const { data, error } = await supabase.from('rendez_vous').update(payload).eq('id', rdv.id).select('*, patient:patients(*)').single();
      if (error) { toast.error('Erreur mise à jour'); setLoading(false); return; }
      updateRendezVous(data as unknown as RendezVous);
      pushHistory({ type: 'UPDATE_RDV', before: rdv!, after: data as unknown as RendezVous });
      toast.success('Rendez-vous mis à jour');
    } else {
      const { data, error } = await supabase.from('rendez_vous').insert(payload).select('*, patient:patients(*)').single();
      if (error) { toast.error('Erreur création'); setLoading(false); return; }
      const created = data as unknown as RendezVous;
      addRendezVous(created);
      pushHistory({ type: 'ADD_RDV', rdv: created });
      toast.success('Rendez-vous créé');
    }
    setLoading(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!rdv) return;
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    const { error } = await supabase.from('rendez_vous').delete().eq('id', rdv.id);
    if (error) { toast.error('Erreur suppression'); return; }
    removeRendezVous(rdv.id);
    pushHistory({ type: 'DELETE_RDV', rdv });
    toast.success('Rendez-vous supprimé');
    onClose();
  };

  const handleDuplicate = async () => {
    if (!rdv || !user) return;
    const payload = { ...form, user_id: user.id };
    const { data, error } = await supabase.from('rendez_vous').insert(payload).select('*, patient:patients(*)').single();
    if (error) { toast.error('Erreur duplication'); return; }
    addRendezVous(data as unknown as RendezVous);
    toast.success('Rendez-vous dupliqué');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="topbar-gradient px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">{rdv ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h2>
          <div className="flex items-center gap-1">
            {rdv && (
              <>
                <button onClick={handleDuplicate} title="Dupliquer" className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={handleDelete} title="Supprimer" className="p-1.5 text-white/60 hover:text-red-300 hover:bg-white/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Mode switcher — always visible for editing too */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 p-1 gap-1 bg-slate-50">
            <button type="button" onClick={() => setMode('patient')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'patient' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <Users className="w-4 h-4" /> Patient enregistré
            </button>
            <button type="button" onClick={() => setMode('occasionnel')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'occasionnel' ? 'bg-white shadow-sm text-road-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <UserPlus className="w-4 h-4" /> Passage rapide
            </button>
          </div>

          {/* Patient selector or occasionnel form */}
          {mode === 'patient' ? (
            <div>
              <label className="label">Patient *</label>
              <select className="input" required value={form.patient_id} onChange={(e) => set('patient_id', e.target.value)}>
                <option value="">— Sélectionner un patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.prenom} {p.nom} — {p.ville}</option>
                ))}
              </select>
              {patients.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Aucun patient enregistré. Utilisez "Passage rapide".</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-road-50 rounded-xl border border-road-100">
              <p className="text-xs font-semibold text-road-700 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Passage rapide — non enregistré dans la liste patients
              </p>
              <div>
                <label className="label">Nom / Surnom *</label>
                <input className="input bg-white" placeholder="Ex: Mme Dupont" value={occasionnel.nom}
                  onChange={(e) => setOccasionnel((o) => ({ ...o, nom: e.target.value }))} />
              </div>
              <div>
                <label className="label">Adresse</label>
                <AddressAutocomplete
                  value={occasionnel.adresse}
                  onChange={(v) => { setOccasionnel((o) => ({ ...o, adresse: v })); setOccCoords(null); }}
                  onSelect={({ lat, lng }) => setOccCoords({ lat, lng })}
                  placeholder="15 rue des Roses, Toulon…"
                  className="input bg-white"
                />
                {occCoords && <p className="text-[10px] text-forest-600 mt-1">📍 Géolocalisé</p>}
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input bg-white" placeholder="06 12 34 56 78" value={occasionnel.telephone}
                  onChange={(e) => setOccasionnel((o) => ({ ...o, telephone: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Date & time */}
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" required value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Début *</label>
              <input type="time" className="input" required value={form.heure_debut} onChange={(e) => handleHeureDebut(e.target.value)} />
            </div>
            <div>
              <label className="label">Durée</label>
              {!customDuree ? (
                <select className="input" value={form.duree_minutes}
                  onChange={(e) => {
                    if (e.target.value === 'custom') { setCustomDuree(true); return; }
                    handleDureeChange(Number(e.target.value));
                  }}>
                  {[15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                  {![15,20,30,45,60,90,120].includes(form.duree_minutes) && (
                    <option value={form.duree_minutes}>{form.duree_minutes} min</option>
                  )}
                  <option value="custom">Personnaliser…</option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input type="number" min={5} step={5} className="input"
                    value={form.duree_minutes}
                    onChange={(e) => handleDureeChange(Math.max(5, Number(e.target.value) || 5))}
                    autoFocus />
                  <button type="button" onClick={() => setCustomDuree(false)}
                    className="btn-ghost px-2 py-2 text-xs flex-shrink-0" title="Revenir aux durées prédéfinies">↩</button>
                </div>
              )}
            </div>
            <div>
              <label className="label">Fin</label>
              <input type="time" className="input bg-slate-50" readOnly value={form.heure_fin} />
            </div>
          </div>

          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.statut} onChange={(e) => set('statut', e.target.value)}>
              {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Couleur personnalisée */}
          <div>
            <label className="label">Couleur du rendez-vous</label>
            <div className="flex items-center gap-2 flex-wrap">
              {['', '#3b82f6','#22c55e','#f97316','#ef4444','#8b5cf6','#ec4899','#0891b2','#ca8a04','#64748b'].map(c => (
                <button key={c} type="button"
                  onClick={() => set('couleur', c)}
                  className="transition-all hover:scale-110"
                  title={c || 'Par défaut'}
                  style={{
                    width: c ? '28px' : 'auto',
                    height: '28px',
                    borderRadius: '8px',
                    background: c || '#f1f5f9',
                    border: form.couleur === c ? '3px solid #1e293b' : '2px solid transparent',
                    outline: c ? 'none' : undefined,
                    padding: c ? '0' : '0 8px',
                    fontSize: '11px',
                    color: '#64748b',
                    fontWeight: 600,
                  }}>
                  {!c && 'Défaut'}
                </button>
              ))}
              {/* Custom hex input */}
              <input type="color" className="w-8 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                value={form.couleur || '#3b82f6'}
                onChange={(e) => set('couleur', e.target.value)}
                title="Couleur personnalisée" />
            </div>
            {form.couleur && (
              <button type="button" onClick={() => set('couleur', '')}
                className="text-xs text-slate-400 hover:text-slate-600 mt-1.5">
                ✕ Réinitialiser la couleur
              </button>
            )}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? 'Enregistrement…' : rdv ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
