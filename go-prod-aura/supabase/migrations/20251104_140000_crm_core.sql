-- =============================================================================
-- Go-Prod AURA • Socle CRM
-- Companies, Contacts, Links, Lookups éditables, Logs, Artiste↔Contact
-- Multi-tenant (company_id) + RLS + RPC
-- =============================================================================

-- 0) Extensions & helpers
create extension if not exists "pgcrypto";

-- updated_at helper
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- récupérer le tenant depuis le JWT
create or replace function public.auth_company_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'company_id','')::uuid;
$$;

-- récupérer l'utilisateur
create or replace function public.auth_uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid;
$$;

-- savoir si c'est le super propriétaire du SaaS (owner admin)
create or replace function public.is_owner_admin()
returns boolean
language sql
stable
as $$
  select coalesce( (current_setting('request.jwt.claims', true)::jsonb->>'is_owner_admin')::boolean, false );
$$;

-- =============================================================================
-- 1) LOOKUPS ÉDITABLES (remplacent les ENUM Postgres)
-- Ces tables sont ce que ta page /app/settings/contacts va éditer.
-- =============================================================================

create table if not exists public.company_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  label text not null,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_company_types_tenant_label unique (company_id, label)
);

create table if not exists public.contact_statuses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  label text not null, -- actif, à valider, blacklist, archivé, ...
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_contact_statuses_tenant_label unique (company_id, label)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  label text not null, -- booking, transport, hospitality, technique, presse, finance, ...
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_departments_tenant_label unique (company_id, label)
);

create table if not exists public.contact_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  label text not null, -- Booker, Tour Manager, Chauffeur, Responsable hôtel, ...
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_contact_roles_tenant_label unique (company_id, label)
);

create table if not exists public.seniority_levels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  label text not null, -- decision, management, opérationnel, assistant
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_seniority_levels_tenant_label unique (company_id, label)
);

-- triggers updated_at sur les lookups
create or replace trigger trg_company_types_updated_at
before update on public.company_types
for each row execute function public.update_updated_at_column();

create or replace trigger trg_contact_statuses_updated_at
before update on public.contact_statuses
for each row execute function public.update_updated_at_column();

create or replace trigger trg_departments_updated_at
before update on public.departments
for each row execute function public.update_updated_at_column();

create or replace trigger trg_contact_roles_updated_at
before update on public.contact_roles
for each row execute function public.update_updated_at_column();

create or replace trigger trg_seniority_levels_updated_at
before update on public.seniority_levels
for each row execute function public.update_updated_at_column();

-- indexes
create index if not exists idx_company_types_company on public.company_types(company_id, active, sort_order);
create index if not exists idx_contact_statuses_company on public.contact_statuses(company_id, active, sort_order);
create index if not exists idx_departments_company on public.departments(company_id, active, sort_order);
create index if not exists idx_contact_roles_company on public.contact_roles(company_id, active, sort_order);
create index if not exists idx_seniority_levels_company on public.seniority_levels(company_id, active, sort_order);

-- FK vers la table companies (tenants SaaS) pour tous les lookups
alter table public.company_types
  add constraint fk_company_types_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

alter table public.contact_statuses
  add constraint fk_contact_statuses_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

alter table public.departments
  add constraint fk_departments_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

alter table public.contact_roles
  add constraint fk_contact_roles_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

alter table public.seniority_levels
  add constraint fk_seniority_levels_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

-- =============================================================================
-- 2) TABLE SOCIETES (crm_companies) — exactement selon ta description
-- Note: on utilise crm_companies car companies existe déjà pour les tenants SaaS
-- =============================================================================
create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null, -- tenant
  company_name text not null,
  brand_name text,
  company_type_id uuid,       -- FK -> company_types (pour ton "company_type (enum)")
  is_supplier boolean not null default false,
  is_client boolean not null default false,
  status_label text not null default 'actif', -- actif, à valider, blacklist, archivé (géré en lookup plus tard si tu veux)
  -- coordonnées générales
  main_phone text,
  main_email text,
  website_url text,
  -- adresse principale
  address_line1 text,
  address_line2 text,
  zip_code text,
  city text,
  country text,
  notes_access text,
  -- facturation / juridique
  billing_name text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_zip_code text,
  billing_city text,
  billing_country text,
  tax_id text,
  registration_number text,
  payment_terms text,
  currency_preferred text,
  iban text,
  swift_bic text,
  finance_email text,
  -- référents internes (FK vers contacts)
  main_contact_id uuid,
  tech_contact_id uuid,
  hospitality_contact_id uuid,
  transport_contact_id uuid,
  -- réseaux sociaux / image publique
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  youtube_url text,
  logo_url text,
  press_notes text,
  -- documents / conformité (bonus métier)
  insurance_certificate_url text,
  compliance_docs_url text,
  contracts_urls text[] default '{}',
  nda_signed_at timestamptz,
  -- metadata AURA
  tags text[] default '{}',
  rating_internal int,
  blacklist_reason text,
  created_by uuid default public.auth_uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace trigger trg_crm_companies_updated_at
before update on public.crm_companies
for each row execute function public.update_updated_at_column();

create index if not exists idx_crm_companies_tenant on public.crm_companies(company_id);
create index if not exists idx_crm_companies_type on public.crm_companies(company_type_id);

-- FK vers la table companies (tenants SaaS)
alter table public.crm_companies
  add constraint fk_crm_companies_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

alter table public.crm_companies
  add constraint fk_crm_companies_company_type
  foreign key (company_type_id) references public.company_types(id)
  on update cascade on delete set null;

-- Ces FK vers crm_contacts seront valides une fois la table crm_contacts créée
-- (on les ajoute plus bas, après crm_contacts)

-- =============================================================================
-- 3) TABLE CONTACTS (crm_contacts) — exactement selon ta description
-- =============================================================================
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null, -- tenant
  -- identité
  first_name text not null,
  last_name text not null,
  display_name text generated always as (
    coalesce(nullif(trim(first_name || ' ' || last_name), ''), last_name)
  ) stored,
  photo_url text,
  -- coordonnées
  email_primary text,
  email_secondary text,
  phone_mobile text,
  phone_whatsapp text,
  phone_office text,
  timezone text,
  -- rôle / fonction
  department_id uuid,       -- FK -> departments
  seniority_level_id uuid,  -- FK -> seniority_levels
  status_id uuid,           -- FK -> contact_statuses (actif, ancien, blacklist, à valider)
  -- réseaux sociaux
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  youtube_url text,
  linkedin_url text,
  telegram_handle text,
  other_contact_channel text,
  -- logistique terrain
  preferred_language text,
  other_languages text[] default '{}',
  access_notes text, -- ⚠ infos sensibles → RLS déjà là via tenant
  -- liens opérationnels
  main_company_id uuid,  -- FK -> crm_companies
  is_primary_for_company_billing boolean not null default false,
  is_night_contact boolean not null default false,
  -- statut relation
  blacklist_reason text,
  trust_level int,
  notes_internal text,
  -- metadata
  tags text[] default '{}',
  created_by uuid default public.auth_uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace trigger trg_crm_contacts_updated_at
before update on public.crm_contacts
for each row execute function public.update_updated_at_column();

create index if not exists idx_crm_contacts_tenant on public.crm_contacts(company_id);
create index if not exists idx_crm_contacts_main_company on public.crm_contacts(main_company_id);
create index if not exists idx_crm_contacts_status on public.crm_contacts(status_id);

-- FK vers la table companies (tenants SaaS)
alter table public.crm_contacts
  add constraint fk_crm_contacts_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

-- FK depuis crm_contacts vers lookups
alter table public.crm_contacts
  add constraint fk_crm_contacts_department
  foreign key (department_id) references public.departments(id)
  on update cascade on delete set null;

alter table public.crm_contacts
  add constraint fk_crm_contacts_seniority
  foreign key (seniority_level_id) references public.seniority_levels(id)
  on update cascade on delete set null;

alter table public.crm_contacts
  add constraint fk_crm_contacts_status
  foreign key (status_id) references public.contact_statuses(id)
  on update cascade on delete set null;

-- FK depuis crm_contacts vers crm_companies
alter table public.crm_contacts
  add constraint fk_crm_contacts_main_company
  foreign key (main_company_id) references public.crm_companies(id)
  on update cascade on delete set null;

-- maintenant qu'on a crm_contacts, on ajoute les FK de crm_companies vers crm_contacts
alter table public.crm_companies
  add constraint fk_crm_companies_main_contact
  foreign key (main_contact_id) references public.crm_contacts(id)
  on update cascade on delete set null;

alter table public.crm_companies
  add constraint fk_crm_companies_tech_contact
  foreign key (tech_contact_id) references public.crm_contacts(id)
  on update cascade on delete set null;

alter table public.crm_companies
  add constraint fk_crm_companies_hosp_contact
  foreign key (hospitality_contact_id) references public.crm_contacts(id)
  on update cascade on delete set null;

alter table public.crm_companies
  add constraint fk_crm_companies_transport_contact
  foreign key (transport_contact_id) references public.crm_contacts(id)
  on update cascade on delete set null;

-- =============================================================================
-- 4) RELATION CONTACTS ↔ SOCIETES (pivot)
-- on évite l'ambiguïté "company_id FK" vs "company_id tenant"
-- donc: tenant = company_id, et la société liée = linked_company_id
-- =============================================================================
create table if not exists public.crm_contact_company_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null, -- tenant
  contact_id uuid not null references public.crm_contacts(id) on update cascade on delete cascade,
  linked_company_id uuid not null references public.crm_companies(id) on update cascade on delete cascade,
  job_title text,
  department_id uuid references public.departments(id) on update cascade on delete set null,
  is_primary_contact boolean not null default false,
  billing_responsible boolean not null default false,
  contract_signatory boolean not null default false,
  valid_from date,
  valid_to date,
  notes_relation text,
  created_by uuid default public.auth_uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, contact_id, linked_company_id)
);

create or replace trigger trg_crm_ccl_updated_at
before update on public.crm_contact_company_links
for each row execute function public.update_updated_at_column();

create index if not exists idx_crm_ccl_tenant on public.crm_contact_company_links(company_id);
create index if not exists idx_crm_ccl_contact on public.crm_contact_company_links(contact_id);
create index if not exists idx_crm_ccl_linked_company on public.crm_contact_company_links(linked_company_id);

-- FK vers la table companies (tenants SaaS)
alter table public.crm_contact_company_links
  add constraint fk_crm_ccl_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

-- garde-fou tenant
create or replace function public.enforce_same_tenant_crm_ccl()
returns trigger
language plpgsql
as $$
declare
  v_tenant_contact uuid;
  v_tenant_company uuid;
begin
  select company_id into v_tenant_contact from public.crm_contacts where id = new.contact_id;
  select company_id into v_tenant_company from public.crm_companies where id = new.linked_company_id;
  if new.company_id is distinct from v_tenant_contact or new.company_id is distinct from v_tenant_company then
    raise exception 'Tenant mismatch on crm_contact_company_links';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crm_ccl_tenant_guard on public.crm_contact_company_links;
create trigger trg_crm_ccl_tenant_guard
before insert or update on public.crm_contact_company_links
for each row execute function public.enforce_same_tenant_crm_ccl();

-- =============================================================================
-- 5) BONUS METIER : activity logs
-- =============================================================================
create table if not exists public.crm_contact_activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  contact_id uuid not null references public.crm_contacts(id) on update cascade on delete cascade,
  event_id uuid, -- si tu veux linker à un event/festival
  activity_type text, -- meeting, call, conflit, no-show, note, ...
  note text,
  created_by uuid default public.auth_uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_crm_contact_activity_tenant on public.crm_contact_activity_log(company_id, contact_id);

-- FK vers la table companies (tenants SaaS)
alter table public.crm_contact_activity_log
  add constraint fk_crm_contact_activity_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

create table if not exists public.crm_company_activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  target_company_id uuid not null references public.crm_companies(id) on update cascade on delete cascade,
  event_id uuid,
  activity_type text,
  note text,
  created_by uuid default public.auth_uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_crm_company_activity_tenant on public.crm_company_activity_log(company_id, target_company_id);

-- FK vers la table companies (tenants SaaS)
alter table public.crm_company_activity_log
  add constraint fk_crm_company_activity_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

-- =============================================================================
-- 6) BONUS METIER : lien contact ↔ artiste (sans toucher au module artiste existant)
-- on suppose qu'il existe déjà public.artists (id uuid)
-- =============================================================================
create table if not exists public.crm_artist_contact_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  artist_id uuid not null references public.artists(id) on update cascade on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on update cascade on delete cascade,
  role_for_artist text, -- agent, tour_manager, presse, ...
  territory text,       -- CH, EU, world...
  is_main_agent boolean not null default false,
  notes text,
  created_by uuid default public.auth_uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, artist_id, contact_id)
);

create or replace trigger trg_crm_artist_contact_links_updated_at
before update on public.crm_artist_contact_links
for each row execute function public.update_updated_at_column();

create index if not exists idx_crm_acl_tenant on public.crm_artist_contact_links(company_id, artist_id);

-- FK vers la table companies (tenants SaaS)
alter table public.crm_artist_contact_links
  add constraint fk_crm_acl_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

-- =============================================================================
-- 7) RLS
-- =============================================================================

-- activer RLS
alter table public.company_types enable row level security;
alter table public.contact_statuses enable row level security;
alter table public.departments enable row level security;
alter table public.contact_roles enable row level security;
alter table public.seniority_levels enable row level security;

alter table public.crm_companies enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_contact_company_links enable row level security;
alter table public.crm_contact_activity_log enable row level security;
alter table public.crm_company_activity_log enable row level security;
alter table public.crm_artist_contact_links enable row level security;

-- policies génériques : owner admin → tout, sinon company_id = auth_company_id()

do $$
begin
  -- lookups
  if not exists (select 1 from pg_policies where policyname = 'p_sel_company_types') then
    create policy p_sel_company_types on public.company_types
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_company_types') then
    create policy p_all_company_types on public.company_types
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  if not exists (select 1 from pg_policies where policyname = 'p_sel_contact_statuses') then
    create policy p_sel_contact_statuses on public.contact_statuses
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_contact_statuses') then
    create policy p_all_contact_statuses on public.contact_statuses
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  if not exists (select 1 from pg_policies where policyname = 'p_sel_departments') then
    create policy p_sel_departments on public.departments
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_departments') then
    create policy p_all_departments on public.departments
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  if not exists (select 1 from pg_policies where policyname = 'p_sel_contact_roles') then
    create policy p_sel_contact_roles on public.contact_roles
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_contact_roles') then
    create policy p_all_contact_roles on public.contact_roles
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  if not exists (select 1 from pg_policies where policyname = 'p_sel_seniority_levels') then
    create policy p_sel_seniority_levels on public.seniority_levels
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_seniority_levels') then
    create policy p_all_seniority_levels on public.seniority_levels
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  -- crm_companies
  if not exists (select 1 from pg_policies where policyname = 'p_sel_crm_companies') then
    create policy p_sel_crm_companies on public.crm_companies
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_ins_crm_companies') then
    create policy p_ins_crm_companies on public.crm_companies
      for insert with check (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_upd_crm_companies') then
    create policy p_upd_crm_companies on public.crm_companies
      for update using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_del_crm_companies') then
    create policy p_del_crm_companies on public.crm_companies
      for delete using (is_owner_admin() or company_id = auth_company_id());
  end if;

  -- crm_contacts
  if not exists (select 1 from pg_policies where policyname = 'p_sel_crm_contacts') then
    create policy p_sel_crm_contacts on public.crm_contacts
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_ins_crm_contacts') then
    create policy p_ins_crm_contacts on public.crm_contacts
      for insert with check (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_upd_crm_contacts') then
    create policy p_upd_crm_contacts on public.crm_contacts
      for update using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_del_crm_contacts') then
    create policy p_del_crm_contacts on public.crm_contacts
      for delete using (is_owner_admin() or company_id = auth_company_id());
  end if;

  -- pivot
  if not exists (select 1 from pg_policies where policyname = 'p_sel_crm_ccl') then
    create policy p_sel_crm_ccl on public.crm_contact_company_links
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_crm_ccl') then
    create policy p_all_crm_ccl on public.crm_contact_company_links
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  -- logs
  if not exists (select 1 from pg_policies where policyname = 'p_sel_crm_contact_activity') then
    create policy p_sel_crm_contact_activity on public.crm_contact_activity_log
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_crm_contact_activity') then
    create policy p_all_crm_contact_activity on public.crm_contact_activity_log
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  if not exists (select 1 from pg_policies where policyname = 'p_sel_crm_company_activity') then
    create policy p_sel_crm_company_activity on public.crm_company_activity_log
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_crm_company_activity') then
    create policy p_all_crm_company_activity on public.crm_company_activity_log
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;

  -- artiste ↔ contact
  if not exists (select 1 from pg_policies where policyname = 'p_sel_crm_artist_contact_links') then
    create policy p_sel_crm_artist_contact_links on public.crm_artist_contact_links
      for select using (is_owner_admin() or company_id = auth_company_id());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'p_all_crm_artist_contact_links') then
    create policy p_all_crm_artist_contact_links on public.crm_artist_contact_links
      for all using (is_owner_admin() or company_id = auth_company_id())
      with check (is_owner_admin() or company_id = auth_company_id());
  end if;
end$$;

-- =============================================================================
-- 8) RPCs pour gérer les options depuis /app/settings/contacts
-- =============================================================================

create or replace function public.upsert_crm_option(
  p_table text,
  p_id uuid,
  p_label text,
  p_active boolean default true,
  p_sort_order int default 100
) returns uuid
language plpgsql
security definer
as $$
declare
  v_company_id uuid := public.auth_company_id();
  v_sql text;
  v_return_id uuid;
begin
  if not (select is_owner_admin() or v_company_id is not null) then
    raise exception 'Unauthorized';
  end if;

  if p_table not in ('company_types','contact_statuses','departments','contact_roles','seniority_levels') then
    raise exception 'Table not allowed';
  end if;

  if p_id is null then
    v_sql := format($f$
      insert into public.%I (company_id, label, active, sort_order)
      values ($1, $2, $3, $4)
      returning id
    $f$, p_table);
    execute v_sql using v_company_id, p_label, p_active, p_sort_order into v_return_id;
  else
    v_sql := format($f$
      update public.%I
         set label = $2,
             active = $3,
             sort_order = $4,
             updated_at = timezone('utc', now())
       where id = $1 and company_id = $5
       returning id
    $f$, p_table);
    execute v_sql using p_id, p_label, p_active, p_sort_order, v_company_id into v_return_id;

    if v_return_id is null then
      raise exception 'Not found or forbidden';
    end if;
  end if;

  return v_return_id;
end;
$$;

grant execute on function public.upsert_crm_option(text, uuid, text, boolean, int) to authenticated;

create or replace function public.disable_crm_option(
  p_table text,
  p_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_company_id uuid := public.auth_company_id();
  v_sql text;
begin
  if not (select is_owner_admin() or v_company_id is not null) then
    raise exception 'Unauthorized';
  end if;

  if p_table not in ('company_types','contact_statuses','departments','contact_roles','seniority_levels') then
    raise exception 'Table not allowed';
  end if;

  v_sql := format($f$
    update public.%I
       set active = false,
           updated_at = timezone('utc', now())
     where id = $1 and company_id = $2
  $f$, p_table);

  execute v_sql using p_id, v_company_id;
end;
$$;

grant execute on function public.disable_crm_option(text, uuid) to authenticated;

-- vue pratique pour l'UI
create or replace view public.v_crm_options as
select 'company_types'::text as table_key, id, company_id, label, active, sort_order from public.company_types
union all
select 'contact_statuses', id, company_id, label, active, sort_order from public.contact_statuses
union all
select 'departments', id, company_id, label, active, sort_order from public.departments
union all
select 'contact_roles', id, company_id, label, active, sort_order from public.contact_roles
union all
select 'seniority_levels', id, company_id, label, active, sort_order from public.seniority_levels;

