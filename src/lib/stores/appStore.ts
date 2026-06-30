import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Patient, RendezVous, UserSettings } from '@/types';
import { supabase } from '@/lib/supabase/client';

// ── History entry for undo/redo ──
// Each action stores everything needed to go both backward (undo) and forward (redo).
type HistoryAction =
  | { type: 'ADD_RDV'; rdv: RendezVous }
  | { type: 'UPDATE_RDV'; before: RendezVous; after: RendezVous }
  | { type: 'DELETE_RDV'; rdv: RendezVous }
  | { type: 'ADD_PATIENT'; patient: Patient }
  | { type: 'UPDATE_PATIENT'; before: Patient; after: Patient }
  | { type: 'DELETE_PATIENT'; patient: Patient }
  | { type: 'UPDATE_SETTINGS'; before: UserSettings; after: UserSettings }
  // One entry covering many RDVs moved at once (e.g. "Optimiser la tournée")
  | { type: 'BATCH_REORDER_RDV'; before: RendezVous[]; after: RendezVous[]; label: string };

const ACTION_LABELS: Record<HistoryAction['type'], string> = {
  ADD_RDV: 'Création de rendez-vous',
  UPDATE_RDV: 'Modification de rendez-vous',
  DELETE_RDV: 'Suppression de rendez-vous',
  ADD_PATIENT: 'Création de patient',
  UPDATE_PATIENT: 'Modification de patient',
  DELETE_PATIENT: 'Suppression de patient',
  UPDATE_SETTINGS: 'Modification des paramètres',
  BATCH_REORDER_RDV: 'Optimisation de tournée',
};

export function describeAction(action: HistoryAction): string {
  if (action.type === 'BATCH_REORDER_RDV') return action.label || ACTION_LABELS[action.type];
  return ACTION_LABELS[action.type];
}

interface AppState {
  // Auth
  user: { id: string; email: string } | null;
  setUser: (user: { id: string; email: string } | null) => void;

  // Patients
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  removePatient: (id: string) => void;

  // Rendez-vous
  rendezVous: RendezVous[];
  setRendezVous: (rdvs: RendezVous[]) => void;
  addRendezVous: (rdv: RendezVous) => void;
  updateRendezVous: (rdv: RendezVous) => void;
  removeRendezVous: (id: string) => void;

  // Settings
  settings: UserSettings | null;
  setSettings: (settings: UserSettings) => void;
  cachedOrsKey: string;
  setCachedOrsKey: (key: string) => void;

  // UI
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // History (undo/redo)
  past: HistoryAction[];   // actions that can be undone (most recent first)
  future: HistoryAction[]; // actions that can be redone (most recent first)
  pushHistory: (action: HistoryAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // Loaders
  loadPatients: () => Promise<void>;
  loadRendezVous: (dateDebut?: string, dateFin?: string) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const MAX_HISTORY = 30;

// Apply one action's effect to local state + Supabase, in a given direction.
// direction 'undo' = revert to "before"/original state.
// direction 'redo' = re-apply to "after"/new state.
async function applyAction(action: HistoryAction, direction: 'undo' | 'redo', set: (fn: (s: AppState) => Partial<AppState>) => void) {
  switch (action.type) {
    case 'ADD_RDV': {
      if (direction === 'undo') {
        await supabase.from('rendez_vous').delete().eq('id', action.rdv.id);
        set((s) => ({ rendezVous: s.rendezVous.filter((r) => r.id !== action.rdv.id) }));
      } else {
        const { data } = await supabase.from('rendez_vous').insert({ ...action.rdv, id: undefined }).select('*, patient:patients(*)').single();
        if (data) set((s) => ({ rendezVous: [...s.rendezVous, data as unknown as RendezVous] }));
      }
      break;
    }
    case 'UPDATE_RDV': {
      const target = direction === 'undo' ? action.before : action.after;
      const { date, heure_debut, heure_fin, duree_minutes, statut, notes, couleur, patient_id, lat, lng } = target;
      await supabase.from('rendez_vous').update({ date, heure_debut, heure_fin, duree_minutes, statut, notes, couleur, patient_id, lat, lng }).eq('id', target.id);
      set((s) => ({ rendezVous: s.rendezVous.map((r) => r.id === target.id ? target : r) }));
      break;
    }
    case 'DELETE_RDV': {
      if (direction === 'undo') {
        const { data } = await supabase.from('rendez_vous').insert({ ...action.rdv, id: undefined }).select('*, patient:patients(*)').single();
        if (data) set((s) => ({ rendezVous: [...s.rendezVous, data as unknown as RendezVous] }));
      } else {
        await supabase.from('rendez_vous').delete().eq('id', action.rdv.id);
        set((s) => ({ rendezVous: s.rendezVous.filter((r) => r.id !== action.rdv.id) }));
      }
      break;
    }
    case 'BATCH_REORDER_RDV': {
      const targets = direction === 'undo' ? action.before : action.after;
      // Persist each RDV's date/heure_debut/heure_fin back to Supabase
      await Promise.all(targets.map(r =>
        supabase.from('rendez_vous').update({ date: r.date, heure_debut: r.heure_debut, heure_fin: r.heure_fin }).eq('id', r.id)
      ));
      set((s) => {
        const byId = new Map(targets.map(r => [r.id, r]));
        return { rendezVous: s.rendezVous.map(r => byId.get(r.id) ?? r) };
      });
      break;
    }
    case 'ADD_PATIENT': {
      if (direction === 'undo') {
        await supabase.from('patients').update({ actif: false }).eq('id', action.patient.id);
        set((s) => ({ patients: s.patients.filter((p) => p.id !== action.patient.id) }));
      } else {
        await supabase.from('patients').update({ actif: true }).eq('id', action.patient.id);
        set((s) => ({ patients: [...s.patients, action.patient] }));
      }
      break;
    }
    case 'UPDATE_PATIENT': {
      const target = direction === 'undo' ? action.before : action.after;
      await supabase.from('patients').update(target).eq('id', target.id);
      set((s) => ({ patients: s.patients.map((p) => p.id === target.id ? target : p) }));
      break;
    }
    case 'DELETE_PATIENT': {
      if (direction === 'undo') {
        await supabase.from('patients').update({ actif: true }).eq('id', action.patient.id);
        set((s) => ({ patients: [...s.patients, action.patient] }));
      } else {
        await supabase.from('patients').update({ actif: false }).eq('id', action.patient.id);
        set((s) => ({ patients: s.patients.filter((p) => p.id !== action.patient.id) }));
      }
      break;
    }
    case 'UPDATE_SETTINGS': {
      const target = direction === 'undo' ? action.before : action.after;
      await supabase.from('user_settings').update(target).eq('id', target.id);
      set(() => ({ settings: target }));
      break;
    }
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      patients: [],
      setPatients: (patients) => set({ patients }),
      addPatient: (patient) => set((s) => ({ patients: [...s.patients, patient] })),
      updatePatient: (patient) => set((s) => ({
        patients: s.patients.map((p) => p.id === patient.id ? patient : p),
      })),
      removePatient: (id) => set((s) => ({ patients: s.patients.filter((p) => p.id !== id) })),

      rendezVous: [],
      setRendezVous: (rendezVous) => set({ rendezVous }),
      addRendezVous: (rdv) => set((s) => ({ rendezVous: [...s.rendezVous, rdv] })),
      updateRendezVous: (rdv) => set((s) => ({
        rendezVous: s.rendezVous.map((r) => r.id === rdv.id ? rdv : r),
      })),
      removeRendezVous: (id) => set((s) => ({ rendezVous: s.rendezVous.filter((r) => r.id !== id) })),

      settings: null,
      setSettings: (settings) => set({ settings }),
      cachedOrsKey: '',
      setCachedOrsKey: (cachedOrsKey) => set({ cachedOrsKey }),

      isOnline: true,
      setIsOnline: (isOnline) => set({ isOnline }),
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      // ── History (undo/redo) ──
      past: [],
      future: [],

      // Pushing a NEW action always clears the redo stack — standard undo/redo behaviour.
      pushHistory: (action) => set((s) => ({
        past: [action, ...s.past].slice(0, MAX_HISTORY),
        future: [],
      })),

      undo: async () => {
        const { past, future, user } = get();
        if (!past.length || !user) return;
        const [last, ...rest] = past;
        set({ past: rest, future: [last, ...future].slice(0, MAX_HISTORY) });
        try {
          await applyAction(last, 'undo', (fn) => set(fn(get())));
        } catch (e) {
          console.error('Undo error:', e);
          // Roll back the history change on failure
          set({ past: [last, ...rest], future });
        }
      },

      redo: async () => {
        const { past, future, user } = get();
        if (!future.length || !user) return;
        const [next, ...rest] = future;
        set({ future: rest, past: [next, ...past].slice(0, MAX_HISTORY) });
        try {
          await applyAction(next, 'redo', (fn) => set(fn(get())));
        } catch (e) {
          console.error('Redo error:', e);
          set({ future: [next, ...rest], past });
        }
      },

      loadPatients: async () => {
        const { user } = get();
        if (!user) return;
        const { data } = await supabase.from('patients').select('*').eq('user_id', user.id).eq('actif', true).order('nom');
        if (data) set({ patients: data as Patient[] });
      },

      loadRendezVous: async (dateDebut?: string, dateFin?: string) => {
        const { user } = get();
        if (!user) return;
        let query = supabase.from('rendez_vous').select('*, patient:patients(*)').eq('user_id', user.id).order('date').order('heure_debut');
        if (dateDebut) query = query.gte('date', dateDebut);
        if (dateFin) query = query.lte('date', dateFin);
        const { data } = await query;
        if (data) set({ rendezVous: data as unknown as RendezVous[] });
      },

      loadSettings: async () => {
        const { user } = get();
        if (!user) return;
        const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
        if (data) set({ settings: data as UserSettings });
      },
    }),
    {
      name: 'visites-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        patients: state.patients,
        rendezVous: state.rendezVous,
        settings: state.settings,
        past: state.past,
        future: state.future,
        cachedOrsKey: state.cachedOrsKey,
      }),
    }
  )
);

export type { HistoryAction };
