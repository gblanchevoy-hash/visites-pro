export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          user_id: string;
          nom: string;
          prenom: string;
          adresse: string;
          code_postal: string;
          ville: string;
          telephone: string | null;
          email: string | null;
          notes: string | null;
          frequence_visite: string | null;
          categorie: string | null;
          couleur: string | null;
          lat: number | null;
          lng: number | null;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      rendez_vous: {
        Row: {
          id: string;
          user_id: string;
          patient_id: string;
          date: string;
          heure_debut: string;
          heure_fin: string;
          duree_minutes: number;
          statut: string;
          notes: string | null;
          couleur: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rendez_vous']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rendez_vous']['Insert']>;
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          adresse_depart: string | null;
          adresse_depart_lat: number | null;
          adresse_depart_lng: number | null;
          ors_api_key: string | null;
          bareme_km: number;
          duree_visite_defaut: number;
          heure_debut_journee: string;
          heure_fin_journee: string;
          categories: string[];
          couleurs_categories: Json;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>;
      };
      frais_kilometriques: {
        Row: {
          id: string;
          user_id: string;
          annee: number;
          mois: number;
          km_parcourus: number;
          bareme: number;
          montant_total: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['frais_kilometriques']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['frais_kilometriques']['Insert']>;
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}
