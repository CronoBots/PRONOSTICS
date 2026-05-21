-- ============================================================================
-- WTF — Migration 0003 : derniers warnings Security Advisor
-- ============================================================================
-- À exécuter dans le SQL Editor après les migrations 0001 et 0002.
--
-- Corrige :
--   1. is_premium(uuid) accessible aux signed-in users → suppression du
--      paramètre, utilise auth.uid() directement (évite l'info-leak sur les
--      autres users)
--   2. rls_auto_enable() (fonction système Supabase créée par "Enable
--      automatic RLS") accessible publiquement → revoke des roles client
-- ============================================================================

-- ============================================================================
-- 1) is_premium : enlève le paramètre, utilise auth.uid()
-- ============================================================================

-- Drop l'ancienne version (avec param p_user_id uuid)
drop function if exists public.is_premium(uuid);

-- Recrée sans paramètre, basée sur auth.uid()
create or replace function public.is_premium()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.active_subscriptions
    where user_id = auth.uid()
  );
$$;

-- Restreindre l'accès : pas public, pas anon, seulement authenticated
revoke execute on function public.is_premium() from public;
revoke execute on function public.is_premium() from anon;
grant execute on function public.is_premium() to authenticated;

-- ============================================================================
-- 2) rls_auto_enable : fonction système Supabase (auto-RLS sur new tables)
--    Ne devrait être exécutable que par le rôle postgres / supabase_admin
--    pour ses besoins internes — pas par les rôles client.
-- ============================================================================

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end$$;

-- ============================================================================
-- Validation
-- ============================================================================
-- Après cette migration, Supabase Advisor doit afficher :
--   - 0 critical
--   - 0 high
--   - 0 warning sur is_premium et rls_auto_enable
--
-- Il peut rester quelques warnings "info" non bloquants (ex: default
-- search_path schema search permissions on auth schema) qui sont du domaine
-- de Supabase et hors de notre contrôle.
