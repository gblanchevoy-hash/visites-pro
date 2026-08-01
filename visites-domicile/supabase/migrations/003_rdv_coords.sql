-- Migration 003 : Coordonnées GPS sur les rendez-vous (pour patients occasionnels)
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter lat/lng au rendez_vous pour les passages rapides
ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS lng double precision;

-- 2. Rendre patient_id nullable (déjà fait en 002 mais au cas où)
ALTER TABLE rendez_vous ALTER COLUMN patient_id DROP NOT NULL;
