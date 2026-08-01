-- Migration 004 : Pseudonyme utilisateur
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS pseudonyme text;
