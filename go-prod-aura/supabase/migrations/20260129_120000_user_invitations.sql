-- =============================================================================
-- Migration: 20260129_120000_user_invitations.sql
-- Objet    : Table des invitations utilisateurs (mode ouvert, sans RLS)
-- =============================================================================

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role_id uuid references public.rbac_roles(id) on delete set null,
  invited_by uuid references public.profiles(id) on delete set null,
  invited_user_id uuid references auth.users(id) on delete set null,
  token_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_invitations_token_hash_idx
  on public.user_invitations(token_hash);

create index if not exists user_invitations_company_idx
  on public.user_invitations(company_id);

create index if not exists user_invitations_status_idx
  on public.user_invitations(status);

create index if not exists user_invitations_email_idx
  on public.user_invitations(lower(email));

comment on table public.user_invitations is
'Invitations utilisateurs (token + statut) générées depuis COMPTE';

-- Trigger de mise à jour updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_invitations_set_updated_at on public.user_invitations;
create trigger user_invitations_set_updated_at
before update on public.user_invitations
for each row
execute function public.set_updated_at();

-- =============================================================================
-- Table de rattachement utilisateur <-> rôle RBAC (sécurisée plus tard via RLS)
-- =============================================================================

create table if not exists public.rbac_user_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.rbac_roles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists rbac_user_roles_unique_idx
  on public.rbac_user_roles(company_id, user_id, role_id);

create index if not exists rbac_user_roles_user_idx
  on public.rbac_user_roles(user_id);


