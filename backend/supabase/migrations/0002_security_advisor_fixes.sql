-- ============================================================================
-- WTF — Migration 0002 : Corrections Supabase Security Advisor
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase après la migration 0001.
--
-- Corrige :
--   1. CRITICAL: Security Definer View → recréation avec security_invoker
--   2. Warning: RLS Initialization Plan → (select auth.uid()) wrap
--   3. Warning: Function Search Path Mutable → set search_path explicit
--   4. Warning: Public Execute SECURITY DEFINER → revoke from public
-- ============================================================================

-- ============================================================================
-- 1) Recréer la VIEW active_subscriptions avec security_invoker = true
--    (au lieu du défaut implicite security_definer)
-- ============================================================================

drop view if exists public.active_subscriptions;

create view public.active_subscriptions
with (security_invoker = true) as
select *
from public.subscriptions
where status = 'active'
  and (current_period_end is null or current_period_end > now());

grant select on public.active_subscriptions to authenticated;

-- ============================================================================
-- 2) RLS Policies : wrap auth.uid() dans un (select ...) pour perf
--    (Postgres l'évalue 1x par query au lieu de 1x par row)
-- ============================================================================

-- PROFILES
drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- SUBSCRIPTIONS
drop policy if exists "Users view own subscriptions" on public.subscriptions;
create policy "Users view own subscriptions"
  on public.subscriptions for select
  using ((select auth.uid()) = user_id);

-- PERSONAL_BETS
drop policy if exists "Users manage own bets" on public.personal_bets;
create policy "Users manage own bets"
  on public.personal_bets for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ============================================================================
-- 3) Functions : SET search_path explicite (sécurise contre l'injection
--    si quelqu'un modifie le search_path session-level)
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.active_subscriptions
    where user_id = p_user_id
  );
$$;

-- ============================================================================
-- 4) Revoke public EXECUTE on security definer functions
--    handle_new_user() : ne doit être appelable que par le trigger système
--    is_premium() : doit rester accessible aux authenticated (et c'est OK car
--                   elle ne fait que lire pour l'utilisateur fourni en argument)
-- ============================================================================

-- handle_new_user : revoke public, garde uniquement trigger system
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
-- Note : le trigger 'on_auth_user_created' fonctionne car PostgreSQL
-- l'exécute en interne via le trigger system, pas via un appel RPC client.

-- is_premium : revoke public, garde authenticated (besoin pour app)
revoke execute on function public.is_premium(uuid) from public;
revoke execute on function public.is_premium(uuid) from anon;
grant execute on function public.is_premium(uuid) to authenticated;

-- ============================================================================
-- Validation
-- ============================================================================
-- Après avoir run cette migration, Supabase Advisor doit afficher 0 warnings
-- critical et 0 high. Les warnings "info" sur le default search_path peuvent
-- rester (c'est un comportement Postgres standard).
