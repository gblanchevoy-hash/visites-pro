-- Migration 005 : Messagerie interne sécurisée entre collaborateurs

-- Table des connexions entre utilisateurs (demande/acceptation)
CREATE TABLE IF NOT EXISTS collaborateurs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  demandeur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinataire_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','accepte','refuse','bloque')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(demandeur_id, destinataire_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expediteur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinataire_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  lu boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table des profils publics (pseudonyme visible par les collaborateurs)
CREATE TABLE IF NOT EXISTS profils_publics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonyme text NOT NULL,
  email_visible boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE collaborateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils_publics ENABLE ROW LEVEL SECURITY;

-- Policies collaborateurs
CREATE POLICY "collab_select" ON collaborateurs FOR SELECT
  USING (auth.uid() = demandeur_id OR auth.uid() = destinataire_id);
CREATE POLICY "collab_insert" ON collaborateurs FOR INSERT
  WITH CHECK (auth.uid() = demandeur_id);
CREATE POLICY "collab_update" ON collaborateurs FOR UPDATE
  USING (auth.uid() = destinataire_id); -- seul le destinataire peut accepter/refuser

-- Policies messages : seulement entre collaborateurs acceptés
CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (auth.uid() = expediteur_id OR auth.uid() = destinataire_id);
CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = expediteur_id AND
    EXISTS (
      SELECT 1 FROM collaborateurs
      WHERE statut = 'accepte'
      AND ((demandeur_id = auth.uid() AND destinataire_id = messages.destinataire_id)
        OR (destinataire_id = auth.uid() AND demandeur_id = messages.destinataire_id))
    )
  );
CREATE POLICY "msg_update" ON messages FOR UPDATE
  USING (auth.uid() = destinataire_id); -- seul le destinataire peut marquer "lu"

-- Policies profils publics
CREATE POLICY "profil_select" ON profils_publics FOR SELECT USING (true); -- visible par tous les connectés
CREATE POLICY "profil_insert" ON profils_publics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profil_update" ON profils_publics FOR UPDATE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER collaborateurs_updated_at BEFORE UPDATE ON collaborateurs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profils_updated_at BEFORE UPDATE ON profils_publics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index performance
CREATE INDEX IF NOT EXISTS idx_messages_expediteur ON messages(expediteur_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON messages(destinataire_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_demandeur ON collaborateurs(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_collab_destinataire ON collaborateurs(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_profils_pseudonyme ON profils_publics(pseudonyme);
