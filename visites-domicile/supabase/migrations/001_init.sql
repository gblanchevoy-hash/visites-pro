-- ====================================================
-- VisitePro — Migration Supabase initiale
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ====================================================

-- ===== TABLE PATIENTS =====
create table if not exists public.patients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text not null,
  prenom text not null,
  adresse text not null default '',
  code_postal text not null default '',
  ville text not null default '',
  telephone text,
  email text,
  notes text,
  frequence_visite text,
  categorie text,
  couleur text default '#6366f1',
  lat double precision,
  lng double precision,
  actif boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===== TABLE RENDEZ-VOUS =====
create table if not exists public.rendez_vous (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  duree_minutes integer not null default 30,
  statut text not null default 'planifie' check (statut in ('planifie', 'effectue', 'annule', 'reporte')),
  notes text,
  couleur text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===== TABLE USER SETTINGS =====
create table if not exists public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  adresse_depart text,
  adresse_depart_lat double precision,
  adresse_depart_lng double precision,
  ors_api_key text,
  bareme_km numeric(6,3) default 0.620 not null,
  duree_visite_defaut integer default 30 not null,
  heure_debut_journee time default '08:00' not null,
  heure_fin_journee time default '19:00' not null,
  categories text[] default '{}',
  couleurs_categories jsonb default '{}',
  theme text default 'light',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ===== TABLE FRAIS KILOMÉTRIQUES =====
create table if not exists public.frais_kilometriques (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  annee integer not null,
  mois integer not null check (mois between 1 and 12),
  km_parcourus numeric(8,1) not null,
  bareme numeric(6,3) not null,
  montant_total numeric(10,2) not null,
  created_at timestamptz default now() not null,
  unique(user_id, annee, mois)
);

-- ===== RLS (Row Level Security) =====
alter table public.patients enable row level security;
alter table public.rendez_vous enable row level security;
alter table public.user_settings enable row level security;
alter table public.frais_kilometriques enable row level security;

-- Policies patients
create policy "patients_user_select" on public.patients for select using (auth.uid() = user_id);
create policy "patients_user_insert" on public.patients for insert with check (auth.uid() = user_id);
create policy "patients_user_update" on public.patients for update using (auth.uid() = user_id);
create policy "patients_user_delete" on public.patients for delete using (auth.uid() = user_id);

-- Policies rendez_vous
create policy "rdv_user_select" on public.rendez_vous for select using (auth.uid() = user_id);
create policy "rdv_user_insert" on public.rendez_vous for insert with check (auth.uid() = user_id);
create policy "rdv_user_update" on public.rendez_vous for update using (auth.uid() = user_id);
create policy "rdv_user_delete" on public.rendez_vous for delete using (auth.uid() = user_id);

-- Policies user_settings
create policy "settings_user_select" on public.user_settings for select using (auth.uid() = user_id);
create policy "settings_user_insert" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "settings_user_update" on public.user_settings for update using (auth.uid() = user_id);

-- Policies frais
create policy "frais_user_select" on public.frais_kilometriques for select using (auth.uid() = user_id);
create policy "frais_user_insert" on public.frais_kilometriques for insert with check (auth.uid() = user_id);
create policy "frais_user_update" on public.frais_kilometriques for update using (auth.uid() = user_id);
create policy "frais_user_delete" on public.frais_kilometriques for delete using (auth.uid() = user_id);

-- ===== AUTO-UPDATE updated_at =====
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger patients_updated_at before update on public.patients
  for each row execute function update_updated_at();

create trigger rendez_vous_updated_at before update on public.rendez_vous
  for each row execute function update_updated_at();

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function update_updated_at();

-- ===== INDEXES =====
create index if not exists idx_patients_user_id on public.patients(user_id);
create index if not exists idx_patients_actif on public.patients(user_id, actif);
create index if not exists idx_rdv_user_date on public.rendez_vous(user_id, date);
create index if not exists idx_rdv_patient on public.rendez_vous(patient_id);
create index if not exists idx_frais_user_annee on public.frais_kilometriques(user_id, annee);
