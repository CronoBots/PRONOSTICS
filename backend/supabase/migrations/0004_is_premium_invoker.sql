-- ============================================================================
-- WTF — Migration 0004 : is_premium() en SECURITY INVOKER
-- ============================================================================
-- Le Supabase Advisor flag toute fonction SECURITY DEFINER callable par les
-- 'authenticated' users. Pour is_premium(), on n'a pas besoin de DEFINER :
-- la RLS sur 'subscriptions' autorise déjà le user à lire ses propres rows,
-- et la view 'active_subscriptions' est en security_invoker (migration 0002).
--
-- Donc INVOKER = même résultat, sans le warning.
-- ============================================================================

-- Drop avant recréation (changement de security mode = drop nécessaire)
drop function if exists public.is_premium();

create or replace function public.is_premium()
returns boolean
language sql
stable
-- SECURITY INVOKER est le défaut (par opposition à DEFINER)
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.active_subscriptions
    where user_id = auth.uid()
  );
$$;

revoke execute on function public.is_premium() from public;
revoke execute on function public.is_premium() from anon;
grant execute on function public.is_premium() to authenticated;

-- ============================================================================
-- Validation
-- ============================================================================
-- Après cette migration, le warning sur is_premium devrait disparaître.
-- Les 3 "more issues" cachés sont probablement liés au schéma auth/storage
-- de Supabase (warnings 'info' non bloquants hors de notre contrôle).
