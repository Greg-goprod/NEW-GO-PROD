-- =============================================================================
-- Table: offer_templates
-- Description: Stocke le modèle PDF d'offre et le mapping des champs pour
--              chaque company (tenant) afin de générer les offres personnalisées.
-- =============================================================================

create table if not exists public.offer_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_path text not null,
  file_name text,
  file_size bigint,
  fields_mapping jsonb not null default '{}'::jsonb,
  detected_fields jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default timezone('utc', now()),
  uploaded_by uuid references auth.users(id),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint offer_templates_company_id_key unique (company_id)
);

comment on table public.offer_templates is 'Modèles PDF d''offre (path + mapping de champs) par tenant';
comment on column public.offer_templates.fields_mapping is 'Mapping JSON champ PDF -> clef de donnée (ex: artist_name, event_name)';
comment on column public.offer_templates.detected_fields is 'Liste des champs détectés automatiquement dans le PDF';

create index if not exists idx_offer_templates_company_id on public.offer_templates(company_id);

create or replace trigger trg_offer_templates_updated_at
before update on public.offer_templates
for each row execute function public.update_updated_at_column();

-- =============================================================================
-- Row Level Security (activée en production – similaire aux autres tables)
-- =============================================================================
alter table public.offer_templates enable row level security;

drop policy if exists "Offer templates are readable by tenant users" on public.offer_templates;
create policy "Offer templates are readable by tenant users"
on public.offer_templates for select
using (company_id = auth_company_id());

drop policy if exists "Offer templates are editable by tenant users" on public.offer_templates;
create policy "Offer templates are editable by tenant users"
on public.offer_templates for insert
with check (company_id = auth_company_id());

drop policy if exists "Offer templates can be updated by tenant users" on public.offer_templates;
create policy "Offer templates can be updated by tenant users"
on public.offer_templates for update
using (company_id = auth_company_id())
with check (company_id = auth_company_id());

drop policy if exists "Offer templates can be deleted by tenant users" on public.offer_templates;
create policy "Offer templates can be deleted by tenant users"
on public.offer_templates for delete
using (company_id = auth_company_id());






















