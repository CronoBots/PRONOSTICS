-- ============================================================================
-- WTF — Migration 0005 : extension table personal_bets pour le tracker perso
-- ============================================================================
-- La table 0001 n'avait que stake / outcome / notes. Pour un vrai tracker
-- "je note mes propres paris", on a besoin de :
--   - sport (foot, basket, tennis, …) pour le filtre / l'emoji
--   - label : libellé du pick (ex. "Ruud vainqueur")
--   - match_label : équipes ou joueurs (ex. "Ruud vs Popyrin")
--   - odds : cote décimale
--   - profit : gain/perte calculé (signed). Persisté pour éviter de recalculer
--     côté client à chaque rendu. Mis à jour quand outcome change.
--
-- Aucun breaking change : les colonnes existantes (stake, outcome, notes,
-- pick_date) restent inchangées, on ajoute seulement de nouvelles colonnes
-- nullable. La policy RLS de 0001/0002 reste valide.
-- ============================================================================

alter table public.personal_bets
  add column if not exists sport text,
  add column if not exists label text,
  add column if not exists match_label text,
  add column if not exists odds numeric(8, 3),
  add column if not exists profit numeric(10, 2) default 0;

-- Index secondaire pour tri par sport (filtres futurs)
create index if not exists idx_personal_bets_user_sport
  on public.personal_bets(user_id, sport);

-- ============================================================================
-- Note : la policy "Users manage own bets" existe déjà (0001 + redéfinie en 0002)
-- et couvre INSERT/UPDATE/DELETE/SELECT. Rien à ajouter ici.
-- ============================================================================
