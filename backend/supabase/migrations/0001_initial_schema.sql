-- ============================================================================
-- WTF — Schéma initial Supabase
-- ============================================================================
-- À exécuter dans le SQL editor de Supabase (dashboard > SQL Editor > New query)
-- Une seule fois lors du setup initial.
--
-- Crée :
--   - Table profiles (extends auth.users)
--   - Table subscriptions (gérée par Stripe webhook)
--   - Table personal_bets (pour le futur tracker de paris perso)
--   - RLS policies
--   - Trigger auto-création du profile à la signup
--   - View active_subscriptions + helper is_premium()
-- ============================================================================

-- 1) PROFILES — données publiques de l'utilisateur (pseudo, etc.)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2) SUBSCRIPTIONS — alimenté UNIQUEMENT par le webhook Stripe (jamais par le client)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null check (status in ('active', 'cancelled', 'expired', 'past_due', 'incomplete')),
  plan text not null check (plan in ('monthly', 'yearly')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_sub_id on public.subscriptions(stripe_subscription_id);

-- 3) PERSONAL_BETS — pour le futur tracker "j'ai parié X€ sur le pick du jour"
create table if not exists public.personal_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pick_date date not null,
  stake numeric(10, 2),
  outcome text check (outcome in ('win', 'loss', 'pending', 'void')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_personal_bets_user_date on public.personal_bets(user_id, pick_date desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.personal_bets enable row level security;

-- PROFILES : un utilisateur voit + modifie son propre profil
drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- SUBSCRIPTIONS : l'utilisateur LIT son propre abonnement, mais ne peut ni l'insérer
-- ni le modifier directement (seul le webhook Stripe en service_role peut écrire).
drop policy if exists "Users view own subscriptions" on public.subscriptions;
create policy "Users view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- PERSONAL_BETS : full CRUD pour l'utilisateur sur ses propres paris
drop policy if exists "Users manage own bets" on public.personal_bets;
create policy "Users manage own bets"
  on public.personal_bets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER : auto-création du profile à la signup
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, pseudo)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'pseudo',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

-- Drop avant recreate (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TRIGGER : auto-update du timestamp updated_at
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_subscriptions on public.subscriptions;
create trigger set_updated_at_subscriptions
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_personal_bets on public.personal_bets;
create trigger set_updated_at_personal_bets
  before update on public.personal_bets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- VIEW : abonnements actifs (= status='active' ET dans la période courante)
-- ============================================================================

create or replace view public.active_subscriptions as
select *
from public.subscriptions
where status = 'active'
  and (current_period_end is null or current_period_end > now());

-- Fonction helper : is_premium(user_id) → boolean
create or replace function public.is_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from public.active_subscriptions
    where user_id = p_user_id
  );
$$;

-- ============================================================================
-- GRANTS pour permettre aux clients authentifiés de query les views
-- ============================================================================

grant select on public.active_subscriptions to authenticated;
grant execute on function public.is_premium(uuid) to authenticated;
