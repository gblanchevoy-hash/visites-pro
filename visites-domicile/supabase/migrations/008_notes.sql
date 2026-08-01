-- Migration 008 : Pense-bêtes utilisateur
CREATE TABLE IF NOT EXISTS notes_rapides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu text NOT NULL DEFAULT '',
  couleur text NOT NULL DEFAULT 'yellow',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes_rapides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON notes_rapides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert" ON notes_rapides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update" ON notes_rapides FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON notes_rapides FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes_rapides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
