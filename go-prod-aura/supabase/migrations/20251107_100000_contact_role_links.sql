-- =============================================================================
-- Migration: Contact Role Links (Association N-N Contacts <-> Rôles)
-- Date: 2025-11-07
-- =============================================================================

-- Table de liaison pour associer plusieurs rôles à un contact
create table if not exists public.crm_contact_role_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null, -- tenant
  contact_id uuid not null references public.crm_contacts(id) on update cascade on delete cascade,
  role_id uuid not null references public.contact_roles(id) on update cascade on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, contact_id, role_id)
);

-- Index pour les recherches
create index if not exists idx_crm_crl_tenant on public.crm_contact_role_links(company_id);
create index if not exists idx_crm_crl_contact on public.crm_contact_role_links(contact_id);
create index if not exists idx_crm_crl_role on public.crm_contact_role_links(role_id);

-- FK vers la table companies (tenants SaaS)
alter table public.crm_contact_role_links
  add constraint fk_crm_crl_tenant
  foreign key (company_id) references public.companies(id)
  on update cascade on delete cascade;

-- Garde-fou tenant
create or replace function public.enforce_same_tenant_crm_crl()
returns trigger
language plpgsql
as $$
declare
  v_tenant_contact uuid;
  v_tenant_role uuid;
begin
  select company_id into v_tenant_contact from public.crm_contacts where id = new.contact_id;
  select company_id into v_tenant_role from public.contact_roles where id = new.role_id;
  
  if new.company_id is distinct from v_tenant_contact or new.company_id is distinct from v_tenant_role then
    raise exception 'Tenant mismatch on crm_contact_role_links';
  end if;
  
  return new;
end;
$$;

create trigger trg_crm_crl_tenant_check
before insert or update on public.crm_contact_role_links
for each row execute function public.enforce_same_tenant_crm_crl();

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================
alter table public.crm_contact_role_links enable row level security;

do $$
begin
  -- SELECT policy
  if not exists (select 1 from pg_policies where policyname = 'p_sel_crm_crl') then
    create policy p_sel_crm_crl on public.crm_contact_role_links
    for select using (public.is_owner_admin() or company_id = public.auth_company_id());
  end if;

  -- ALL policy (INSERT, UPDATE, DELETE)
  if not exists (select 1 from pg_policies where policyname = 'p_all_crm_crl') then
    create policy p_all_crm_crl on public.crm_contact_role_links
    for all using (public.is_owner_admin() or company_id = public.auth_company_id());
  end if;
end $$;

-- =============================================================================
-- Fin de la migration
-- =============================================================================










