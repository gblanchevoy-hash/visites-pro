-- Migration 009 : Récurrence des rendez-vous
ALTER TABLE rendez_vous
  ADD COLUMN IF NOT EXISTS recurrence_type text CHECK (recurrence_type IN ('none','daily','weekly','biweekly','monthly','custom')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_days  int[]    DEFAULT NULL, -- pour custom : [1,3,5] = lun,mer,ven
  ADD COLUMN IF NOT EXISTS recurrence_end   date     DEFAULT NULL, -- date de fin de la récurrence
  ADD COLUMN IF NOT EXISTS recurrence_id    uuid     DEFAULT NULL; -- ID du RDV parent (pour lier les occurrences)

CREATE INDEX IF NOT EXISTS idx_rdv_recurrence_id ON rendez_vous(recurrence_id);
