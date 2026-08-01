-- =====================================================
-- Migration 002 : Sécurité renforcée
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Rendre patient_id nullable dans rendez_vous (pour patients occasionnels)
ALTER TABLE rendez_vous ALTER COLUMN patient_id DROP NOT NULL;

-- 2. Ajouter contrainte FK avec ON DELETE SET NULL
ALTER TABLE rendez_vous DROP CONSTRAINT IF EXISTS rendez_vous_patient_id_fkey;
ALTER TABLE rendez_vous
  ADD CONSTRAINT rendez_vous_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

-- 3. Renforcer les politiques RLS — s'assurer qu'elles existent
DO $$
BEGIN
  -- Patients
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patients' AND policyname='patients_select') THEN
    CREATE POLICY patients_select ON patients FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patients' AND policyname='patients_insert') THEN
    CREATE POLICY patients_insert ON patients FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patients' AND policyname='patients_update') THEN
    CREATE POLICY patients_update ON patients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patients' AND policyname='patients_delete') THEN
    CREATE POLICY patients_delete ON patients FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- Rendez-vous
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rendez_vous' AND policyname='rdv_select') THEN
    CREATE POLICY rdv_select ON rendez_vous FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rendez_vous' AND policyname='rdv_insert') THEN
    CREATE POLICY rdv_insert ON rendez_vous FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rendez_vous' AND policyname='rdv_update') THEN
    CREATE POLICY rdv_update ON rendez_vous FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rendez_vous' AND policyname='rdv_delete') THEN
    CREATE POLICY rdv_delete ON rendez_vous FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Index supplémentaires pour performance
CREATE INDEX IF NOT EXISTS idx_rdv_user_date ON rendez_vous(user_id, date);
CREATE INDEX IF NOT EXISTS idx_patients_user_actif ON patients(user_id, actif);
