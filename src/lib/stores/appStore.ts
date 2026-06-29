import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Patient, RendezVous, UserSettings } from '@/types';
import { supabase } from '@/lib/supabase/client';

// ── History entry for undo ──
type HistoryAction =
  | { type: 'ADD_RDV'; rdv: RendezVous }
  | { type: 'UPDATE_RDV'; before: RendezVous; after: RendezVous }
  | { type: 'DELETE_RDV'; rdv: RendezVous }
  | { type: 'ADD_PATIENT'; patient: Patient }
  | { type: 'UPDATE_PATIENT'; before: Patient; after: Patient }
  | { type: 'DELETE_PATIENT'; patient: Patient }
  | { type: 'UPDATE_SETTINGS'; before: UserSettings; after: UserSettings };

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
  // ORS key cached separately to survive settings reload
  cachedOrsKey: string;
  setCachedOrsKey: (key: string) => void;

  // UI
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // History (undo)
  history: HistoryAction[];
  pushHistory: (action: HistoryAction) => void;
  undo: () => Promise<void>;

  // Loaders
  loadPatients: () => Promise<void>;
  loadRendezVous: (dateDebut?: string, dateFin?: string) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const MAX_HISTORY = 20;

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

      // ── History ──
      history: [],
      pushHistory: (action) => set((s) => ({
        history: [action, ...s.history].slice(0, MAX_HISTORY),
      })),

      undo: async () => {
        const { history, user } = get();
        if (!history.length || !user) return;
        const [last, ...rest] = history;
        set({ history: rest });

        try {
          switch (last.type) {
            case 'ADD_RDV': {
              await supabase.from('rendez_vous').delete().eq('id', last.rdv.id);
              set((s) => ({ rendezVous: s.rendezVous.filter((r) => r.id !== last.rdv.id) }));
              break;
            }
            case 'UPDATE_RDV': {
              const { date, heure_debut, heure_fin, duree_minutes, statut, notes, couleur, patient_id } = last.before;
              await supabase.from('rendez_vous').update({ date, heure_debut, heure_fin, duree_minutes, statut, notes, couleur, patient_id }).eq('id', last.before.id);
              set((s) => ({ rendezVous: s.rendezVous.map((r) => r.id === last.before.id ? last.before : r) }));
              break;
            }
            case 'DELETE_RDV': {
              const { data } = await supabase.from('rendez_vous').insert({ ...last.rdv, id: undefined }).select('*, patient:patients(*)').single();
              if (data) set((s) => ({ rendezVous: [...s.rendezVous, data as unknown as RendezVous] }));
              break;
            }
            case 'ADD_PATIENT': {
              await supabase.from('patients').update({ actif: false }).eq('id', last.patient.id);
              set((s) => ({ patients: s.patients.filter((p) => p.id !== last.patient.id) }));
              break;
            }
            case 'UPDATE_PATIENT': {
              await supabase.from('patients').update(last.before).eq('id', last.before.id);
              set((s) => ({ patients: s.patients.map((p) => p.id === last.before.id ? last.before : p) }));
              break;
            }
            case 'DELETE_PATIENT': {
              await supabase.from('patients').update({ actif: true }).eq('id', last.patient.id);
              set((s) => ({ patients: [...s.patients, last.patient] }));
              break;
            }
            case 'UPDATE_SETTINGS': {
              await supabase.from('user_settings').update(last.before).eq('id', last.before.id);
              set({ settings: last.before });
              break;
            }
          }
        } catch (e) {
          console.error('Undo error:', e);
          // Restore history entry on failure
          set((s) => ({ history: [last, ...s.history] }));
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
        history: state.history,
        cachedOrsKey: state.cachedOrsKey,
      }),
    }
  )
);
