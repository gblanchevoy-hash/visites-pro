-- Migration 010 : Index de performance pour 300+ utilisateurs

-- rendez_vous : requêtes les plus fréquentes
CREATE INDEX IF NOT EXISTS idx_rdv_user_date 
  ON rendez_vous(user_id, date);

CREATE INDEX IF NOT EXISTS idx_rdv_user_statut 
  ON rendez_vous(user_id, statut);

CREATE INDEX IF NOT EXISTS idx_rdv_patient 
  ON rendez_vous(patient_id) WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rdv_recurrence 
  ON rendez_vous(recurrence_id) WHERE recurrence_id IS NOT NULL;

-- patients : recherche par nom
CREATE INDEX IF NOT EXISTS idx_patients_user 
  ON patients(user_id);

CREATE INDEX IF NOT EXISTS idx_patients_nom 
  ON patients(user_id, nom text_pattern_ops);

-- frais_kilometriques : rapport fiscal par année
CREATE INDEX IF NOT EXISTS idx_frais_user_annee 
  ON frais_kilometriques(user_id, annee, mois);

-- subscriptions : vérification abonnement (appelée à chaque chargement)
CREATE INDEX IF NOT EXISTS idx_sub_user_statut 
  ON subscriptions(user_id, statut);

-- notes_rapides
CREATE INDEX IF NOT EXISTS idx_notes_user 
  ON notes_rapides(user_id, updated_at DESC);

-- Statistiques de taille des tables (utile pour monitoring)
COMMENT ON INDEX idx_rdv_user_date IS 'Principal index planning - filtrage par utilisateur et date';
COMMENT ON INDEX idx_frais_user_annee IS 'Index rapport fiscal - filtrage par année';
