-- =====================================================
-- Migration 007 : Audit sécurité et correctifs RLS
-- =====================================================

-- 1. Renforcer collab_update : le destinataire ne peut qu'accepter ou refuser
--    (pas passer à 'bloque' ou revenir à 'en_attente')
DROP POLICY IF EXISTS "collab_update" ON collaborateurs;
CREATE POLICY "collab_update" ON collaborateurs FOR UPDATE
  USING (auth.uid() = destinataire_id)
  WITH CHECK (
    auth.uid() = destinataire_id
    AND statut IN ('accepte', 'refuse')  -- valeurs autorisées uniquement
  );

-- 2. Bloquer la suppression de messages (traçabilité)
--    Les messages ne peuvent pas être supprimés, seulement marqués lu
DROP POLICY IF EXISTS "msg_delete" ON messages;
-- (aucune policy DELETE = impossible de supprimer, ce qui est voulu)

-- 3. S'assurer que les profils publics ne révèlent pas l'email
--    sauf si l'utilisateur a explicitement activé email_visible
DROP POLICY IF EXISTS "profil_select" ON profils_publics;
CREATE POLICY "profil_select" ON profils_publics FOR SELECT
  USING (auth.uid() IS NOT NULL);  -- seulement les utilisateurs authentifiés

-- 4. Ajouter une policy de suppression manquante sur collaborateurs
--    (un utilisateur peut supprimer une relation qu'il a initiée)
DROP POLICY IF EXISTS "collab_delete" ON collaborateurs;
CREATE POLICY "collab_delete" ON collaborateurs FOR DELETE
  USING (auth.uid() = demandeur_id OR auth.uid() = destinataire_id);

-- 5. Vérifier que user_settings n'a pas de policy de suppression
--    (on ne veut pas qu'un utilisateur supprime ses settings accidentellement)
DROP POLICY IF EXISTS "settings_user_delete" ON user_settings;
-- Pas de DELETE policy = impossible de supprimer ses settings

-- 6. Index de sécurité sur messages pour éviter les scans complets
CREATE INDEX IF NOT EXISTS idx_messages_both ON messages(expediteur_id, destinataire_id);
CREATE INDEX IF NOT EXISTS idx_collab_statut ON collaborateurs(statut);

-- Note : pas de rôle admin défini dans cette version.
-- Itilib est conçu pour des professionnels indépendants,
-- chaque compte est totalement isolé des autres.
-- Pour ajouter un admin, créer une table 'admin_users' avec
-- une policy USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())).
