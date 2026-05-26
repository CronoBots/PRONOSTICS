-- ============================================================================
-- Migration 0006 : ajout colonne bookmaker à personal_bets
-- ============================================================================
-- Tracker perso : permettre au user de noter QUEL bookmaker il a utilisé pour
-- placer ses paris (Unibet Belgique, Bet365, Betclic, etc.). Info privée à
-- l'utilisateur, ne sort jamais dans les rapports NEXBET agnostiques.
--
-- Aucun breaking change : colonne optionnelle, valeur par défaut NULL.
-- Les paris existants ne sont pas affectés.
-- ============================================================================

alter table public.personal_bets
  add column if not exists bookmaker text;

-- Index utile pour les futures stats "perf par bookmaker"
create index if not exists idx_personal_bets_user_bookmaker
  on public.personal_bets(user_id, bookmaker)
  where bookmaker is not null;
