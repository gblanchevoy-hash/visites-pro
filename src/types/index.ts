// ==================== PATIENT ====================
export interface Patient {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  telephone?: string;
  email?: string;
  notes?: string;
  frequence_visite?: string;
  categorie?: string;
  couleur?: string;
  lat?: number;
  lng?: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== RENDEZ-VOUS ====================
export interface RendezVous {
  id: string;
  user_id: string;
  patient_id: string | null;
  patient?: Patient;
  date: string; // ISO date YYYY-MM-DD
  heure_debut: string; // HH:mm
  heure_fin: string;
  duree_minutes: number;
  statut: 'planifie' | 'effectue' | 'annule' | 'reporte';
  notes?: string | null;
  couleur?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  updated_at: string;
}

// ==================== TOURNÉE ====================
export interface Tournee {
  id: string;
  user_id: string;
  date: string;
  rendez_vous: RendezVous[];
  itineraire?: Itineraire;
  km_total?: number;
  duree_trajet_min?: number;
  frais_km?: number;
  created_at: string;
}

export interface Itineraire {
  etapes: Etape[];
  km_total: number;
  duree_min: number;
  geometry?: GeoJSON.LineString;
}

export interface Etape {
  rdv: RendezVous;
  distance_km: number;
  duree_min: number;
  ordre: number;
}

// ==================== FRAIS ====================
export interface FraisKilometriques {
  id: string;
  user_id: string;
  annee: number;
  mois: number;
  km_parcourus: number;
  bareme: number; // €/km
  montant_total: number;
  created_at: string;
}

export interface BaremeKm {
  id: string;
  user_id: string;
  annee: number;
  taux: number; // €/km
  actif: boolean;
}

// ==================== STATS ====================
export interface StatsMensuelles {
  mois: string;
  nb_visites: number;
  km_total: number;
  duree_trajet_min: number;
  duree_soin_min: number;
  frais_total: number;
}

// ==================== CONFIG ====================
export interface UserSettings {
  pseudonyme?: string | null;
  id: string;
  user_id: string;
  adresse_depart?: string;
  adresse_depart_lat?: number;
  adresse_depart_lng?: number;
  ors_api_key?: string;
  bareme_km: number;
  duree_visite_defaut: number; // minutes
  heure_debut_journee: string;
  heure_fin_journee: string;
  categories: string[];
  couleurs_categories: Record<string, string>;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

// ==================== GEOCODING ====================
export interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
}

// ==================== FORMS ====================
export type PatientFormData = Omit<Patient, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type RdvFormData = Omit<RendezVous, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'patient'>;
