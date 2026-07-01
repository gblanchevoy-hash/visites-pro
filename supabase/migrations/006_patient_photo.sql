-- Migration 006 : Photo sur les fiches patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url text;
