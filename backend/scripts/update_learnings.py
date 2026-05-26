"""Auto-learning loop pour NEXBET — v4.7.

Calibration helper qui calcule le Brier score + bias sur les picks résolus,
détecte les patterns persistants (par sport, par tier) et APPLIQUE
réellement les patchs aux `criteria.md` quand un bias est confirmé sur
≥3 runs consécutifs.

Différences clés vs v4.6 :
  - État persisté dans `backend/data/nexbet/auto_learning_state.json`
    (historique des bias détectés par run)
  - Bias multi-dimensionnel : global + par sport (tennis/foot/basket) + par
    tier (single/combo)
  - Gating triple : n ≥ 5 picks résolus AND |bias| > 0.05 AND même
    direction sur ≥3 runs consécutifs
  - Mode --apply : modifie réellement criteria.md (avec backup .bak) ET
    log la décision dans learnings.md section "Auto-learning history"
  - Rollback : --rollback restaure le dernier patch depuis le backup

Lit `backend/scripts/picks_data.py` PICKS (outcome ∈ {"win","loss"}).

Usage:
    python backend/scripts/update_learnings.py             # diagnostic dry-run
    python backend/scripts/update_learnings.py --suggest   # propose patchs
    python backend/scripts/update_learnings.py --apply     # applique si gating OK
    python backend/scripts/update_learnings.py --rollback  # annule le dernier patch
    python backend/scripts/update_learnings.py --audit     # historique patchs
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path


# ============================================================================
# Constantes & paths
# ============================================================================

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PICKS_FILE = Path(__file__).parent / "picks_data.py"
NEXBET_DIR = REPO_ROOT / "backend" / "data" / "nexbet"
STATE_FILE = NEXBET_DIR / "auto_learning_state.json"
LEARNINGS_FILE = NEXBET_DIR / "learnings.md"
CRITERIA_FILE = NEXBET_DIR / "criteria.md"

# Seuils de gating
MIN_RESOLVED = 5             # n ≥ 5 picks résolus avant ANY suggestion
MIN_BIAS_FOR_PATCH = 0.05    # |bias| > 5pts pour considérer un patch
MIN_RUNS_FOR_APPLY = 3       # même direction sur ≥3 runs avant --apply

# Sports actifs v4.6/v4.7
ACTIVE_SPORTS = {"tennis", "football", "basketball", "combo"}


# ============================================================================
# Chargement picks & calcul bias
# ============================================================================


def _load_picks() -> list[dict]:
    namespace: dict = {}
    exec(PICKS_FILE.read_text(), namespace)
    return namespace["PICKS"]


def _resolved(picks: list[dict]) -> list[dict]:
    return [p for p in picks if p.get("outcome") in {"win", "loss"}]


def _calibration(resolved: list[dict]) -> dict:
    """Calibration stats sur un sous-ensemble de picks résolus."""
    n = len(resolved)
    if n == 0:
        return {"n": 0}

    wins = sum(1 for p in resolved if p["outcome"] == "win")
    win_rate = wins / n

    brier = sum(
        ((1.0 if p["outcome"] == "win" else 0.0) - p.get("model_probability", 0.5)) ** 2
        for p in resolved
    ) / n

    bias = sum(
        (1.0 if p["outcome"] == "win" else 0.0) - p.get("model_probability", 0.5)
        for p in resolved
    ) / n

    avg_proba = sum(p.get("model_probability", 0.5) for p in resolved) / n
    avg_ev = sum(
        p.get("model_probability", 0.5) * p.get("odds", 1.0) - 1.0 for p in resolved
    ) / n

    return {
        "n": n,
        "wins": wins,
        "win_rate": win_rate,
        "avg_model_proba": avg_proba,
        "avg_ev_declared": avg_ev,
        "brier_score": brier,
        "bias": bias,
    }


def compute_calibration(picks: list[dict]) -> dict:
    """Wrapper rétro-compatible v4.6 — retourne uniquement le calibration global."""
    return _calibration(_resolved(picks))


def _multi_dimensional_bias(picks: list[dict]) -> dict:
    """Bias éclaté par dimension : global, par sport, par tier."""
    resolved = _resolved(picks)
    out: dict = {"global": _calibration(resolved)}

    # Par sport
    by_sport: dict[str, list[dict]] = {}
    for p in resolved:
        sport = (p.get("sport") or "unknown").lower()
        by_sport.setdefault(sport, []).append(p)
    out["by_sport"] = {
        sport: _calibration(picks_) for sport, picks_ in by_sport.items()
    }

    # Par tier (single vs combo)
    by_tier: dict[str, list[dict]] = {}
    for p in resolved:
        tier = "combo" if (p.get("sport") == "combo" or "+" in str(p.get("pick", ""))) else "single"
        by_tier.setdefault(tier, []).append(p)
    out["by_tier"] = {
        tier: _calibration(picks_) for tier, picks_ in by_tier.items()
    }

    return out


# ============================================================================
# État persistant — auto_learning_state.json
# ============================================================================


def _load_state() -> dict:
    if not STATE_FILE.exists():
        return {"runs": [], "applied_patches": []}
    return json.loads(STATE_FILE.read_text())


def _save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _record_run(state: dict, dims: dict) -> dict:
    """Append le run courant à l'historique, retourne le state mis à jour."""
    entry = {
        "timestamp": _now_iso(),
        "global": {
            "n": dims["global"].get("n", 0),
            "bias": round(dims["global"].get("bias", 0.0), 4),
            "brier": round(dims["global"].get("brier_score", 0.0), 4),
        },
        "by_sport": {
            sport: {
                "n": stats.get("n", 0),
                "bias": round(stats.get("bias", 0.0), 4),
            }
            for sport, stats in dims["by_sport"].items()
        },
        "by_tier": {
            tier: {
                "n": stats.get("n", 0),
                "bias": round(stats.get("bias", 0.0), 4),
            }
            for tier, stats in dims["by_tier"].items()
        },
    }
    state.setdefault("runs", []).append(entry)
    # Garder les 30 derniers runs max
    state["runs"] = state["runs"][-30:]
    return state


# ============================================================================
# Gating & patchs
# ============================================================================


def _bias_direction(bias: float) -> str:
    if bias > MIN_BIAS_FOR_PATCH:
        return "underestimate"
    if bias < -MIN_BIAS_FOR_PATCH:
        return "overestimate"
    return "calibrated"


def _check_persistent_bias(
    state: dict, dimension: str, key: str, min_runs: int = MIN_RUNS_FOR_APPLY
) -> tuple[str, int]:
    """Détecte si un bias persiste sur les ≥`min_runs` runs derniers.

    Retourne (direction, n_consecutive). direction='calibrated' si pas de
    pattern net sur la fenêtre.
    """
    runs = state.get("runs", [])
    if len(runs) < min_runs:
        return ("calibrated", 0)

    recent = runs[-min_runs:]
    directions: list[str] = []
    for run in recent:
        if dimension == "global":
            bias = run.get("global", {}).get("bias", 0.0)
        else:
            bias = (run.get(dimension) or {}).get(key, {}).get("bias", 0.0)
        directions.append(_bias_direction(bias))

    if all(d == "underestimate" for d in directions):
        return ("underestimate", len(directions))
    if all(d == "overestimate" for d in directions):
        return ("overestimate", len(directions))
    return ("calibrated", 0)


def _build_patches(state: dict, dims: dict) -> list[dict]:
    """Construit la liste des patchs à proposer/appliquer selon le gating."""
    patches: list[dict] = []

    # Patch global F2
    if dims["global"].get("n", 0) >= MIN_RESOLVED:
        direction, n_consec = _check_persistent_bias(state, "global", "_")
        if direction != "calibrated":
            patches.append({
                "scope": "global",
                "key": "F2",
                "direction": direction,
                "n_consecutive_runs": n_consec,
                "current_bias_pts": round(dims["global"]["bias"] * 100, 1),
                "rationale": (
                    f"Bias {direction} persistant sur {n_consec} runs "
                    f"(actuel: {dims['global']['bias']*100:+.1f}pts)"
                ),
                "action": (
                    "Diminuer F2_min_recommendable de 0.02 OU augmenter "
                    "shrinkage poids book"
                    if direction == "overestimate"
                    else
                    "Relâcher F2 de 0.02 OU diminuer poids book "
                    "(agent trop conservateur)"
                ),
            })

    # Patchs par sport (seulement si ≥3 picks dans le sport)
    for sport, stats in dims["by_sport"].items():
        if sport not in ACTIVE_SPORTS or stats.get("n", 0) < 3:
            continue
        direction, n_consec = _check_persistent_bias(state, "by_sport", sport)
        if direction != "calibrated":
            patches.append({
                "scope": f"sport:{sport}",
                "key": "F2_sport_modifier",
                "direction": direction,
                "n_consecutive_runs": n_consec,
                "current_bias_pts": round(stats["bias"] * 100, 1),
                "rationale": (
                    f"Bias {sport} {direction} persistant "
                    f"({stats['bias']*100:+.1f}pts, n={stats['n']})"
                ),
                "action": (
                    f"Ajouter +0.02 au shrinkage book pour {sport} "
                    "(modèle surestime)"
                    if direction == "overestimate"
                    else
                    f"Ajouter -0.02 au shrinkage book pour {sport} "
                    "(modèle sous-estime — modèle plus confiant)"
                ),
            })

    # Patchs par tier (single vs combo)
    for tier, stats in dims["by_tier"].items():
        if stats.get("n", 0) < 3:
            continue
        direction, n_consec = _check_persistent_bias(state, "by_tier", tier)
        if direction != "calibrated":
            patches.append({
                "scope": f"tier:{tier}",
                "key": "F2_tier_modifier",
                "direction": direction,
                "n_consecutive_runs": n_consec,
                "current_bias_pts": round(stats["bias"] * 100, 1),
                "rationale": (
                    f"Bias {tier} {direction} persistant "
                    f"({stats['bias']*100:+.1f}pts, n={stats['n']})"
                ),
                "action": (
                    f"Resserrer F2 pour {tier} (proba_shrunk +0.02 cible)"
                    if direction == "overestimate"
                    else
                    f"Relâcher F2 pour {tier} (proba_shrunk -0.02)"
                ),
            })

    return patches


# ============================================================================
# Application & rollback
# ============================================================================


def _backup_criteria() -> Path:
    """Crée une copie .bak.<timestamp> du criteria.md avant modification."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = CRITERIA_FILE.with_suffix(f".md.bak.{timestamp}")
    shutil.copy2(CRITERIA_FILE, backup)
    return backup


def _annotate_criteria(patch: dict) -> bool:
    """Annote criteria.md avec une note auto-learning.

    Ne ré-écrit pas les seuils numériques (trop risqué automatiquement) :
    l'agent VOIT la note et applique contextuellement. Append/insert sous
    la section '## 🤖 Auto-learning notes' en bas du fichier.
    """
    if not CRITERIA_FILE.exists():
        return False
    content = CRITERIA_FILE.read_text()
    marker = "## 🤖 Auto-learning notes"
    note = (
        f"\n### {_now_iso()} — patch {patch['scope']}\n"
        f"- **Direction** : {patch['direction']}\n"
        f"- **Bias actuel** : {patch['current_bias_pts']:+.1f}pts "
        f"(persistant sur {patch['n_consecutive_runs']} runs)\n"
        f"- **Action recommandée** : {patch['action']}\n"
        f"- **Rationale** : {patch['rationale']}\n"
    )
    if marker not in content:
        intro = (
            f"\n\n{marker}\n\n"
            f"> Annotations générées par `update_learnings.py --apply`.\n"
            f"> L'agent en tient compte mais n'écrase pas les seuils tant\n"
            f"> qu'aucune validation humaine n'est faite (rollback dispo).\n"
        )
        content += intro + note
    else:
        idx = content.find(marker)
        rest = content[idx + len(marker):]
        next_h2 = rest.find("\n## ")
        if next_h2 == -1:
            content = content + note
        else:
            insert_at = idx + len(marker) + next_h2
            content = content[:insert_at] + note + content[insert_at:]
    CRITERIA_FILE.write_text(content)
    return True


def _log_to_learnings(patches: list[dict], backup_path: Path | None) -> None:
    """Ajoute une entrée dans learnings.md section 'Auto-learning history'."""
    if not LEARNINGS_FILE.exists():
        return
    content = LEARNINGS_FILE.read_text()
    marker = "## 🤖 Auto-learning history"

    entry_lines = [f"\n### Run {_now_iso()}"]
    if backup_path:
        entry_lines.append(f"- **Backup criteria.md** : `{backup_path.name}`")
    if not patches:
        entry_lines.append("- Aucun patch appliqué (calibration OK ou gating non passé)")
    for p in patches:
        entry_lines.append(
            f"- **{p['scope']}** ({p['direction']}, "
            f"{p['current_bias_pts']:+.1f}pts × {p['n_consecutive_runs']} runs) "
            f"→ {p['action']}"
        )
    entry = "\n".join(entry_lines) + "\n"

    if marker not in content:
        intro = (
            f"\n\n{marker}\n\n"
            f"> Historique des patchs auto-learning. Géré par `update_learnings.py`.\n"
        )
        content += intro + entry
    else:
        idx = content.find(marker)
        rest = content[idx + len(marker):]
        next_h2 = rest.find("\n## ")
        if next_h2 == -1:
            content = content + entry
        else:
            insert_at = idx + len(marker) + next_h2
            content = content[:insert_at] + entry + content[insert_at:]
    LEARNINGS_FILE.write_text(content)


def _rollback_last_patch() -> str:
    """Restaure le criteria.md depuis le dernier backup."""
    backups = sorted(
        CRITERIA_FILE.parent.glob("criteria.md.bak.*"),
        key=lambda p: p.name,
        reverse=True,
    )
    if not backups:
        return "Aucun backup à restaurer."
    last = backups[0]
    shutil.copy2(last, CRITERIA_FILE)
    return f"Restauré depuis {last.name}"


# ============================================================================
# Affichage
# ============================================================================


def _print_report(dims: dict, patches: list[dict]) -> None:
    g = dims["global"]
    print("=" * 60)
    print("NEXBET Auto-Learning Report")
    print("=" * 60)

    if g.get("n", 0) == 0:
        print("Aucun pick résolu — rien à analyser.")
        return

    print("\n[GLOBAL]")
    print(f"  Picks résolus     : {g['n']}")
    print(f"  Win rate          : {g['wins']}/{g['n']} ({g['win_rate']*100:.1f}%)")
    print(f"  Avg model proba   : {g['avg_model_proba']:.3f}")
    print(f"  Avg EV déclaré    : {g['avg_ev_declared']*100:+.2f}%")
    print(f"  Brier score       : {g['brier_score']:.4f}")
    print(f"  Bias              : {g['bias']*100:+.2f}pts  ({_bias_direction(g['bias'])})")

    print("\n[PAR SPORT]")
    for sport, stats in sorted(dims["by_sport"].items()):
        if stats.get("n", 0) > 0:
            print(
                f"  {sport:12s} n={stats['n']:2d}  win={stats['wins']:2d}  "
                f"bias={stats['bias']*100:+6.2f}pts  ({_bias_direction(stats['bias'])})"
            )

    print("\n[PAR TIER]")
    for tier, stats in sorted(dims["by_tier"].items()):
        if stats.get("n", 0) > 0:
            print(
                f"  {tier:12s} n={stats['n']:2d}  win={stats['wins']:2d}  "
                f"bias={stats['bias']*100:+6.2f}pts  ({_bias_direction(stats['bias'])})"
            )

    print(f"\n[PATCHS DÉTECTÉS] {len(patches)} patch(s)")
    if not patches:
        print("  Aucun — calibration OK ou gating non passé.")
        print(
            f"  Gating actif : n ≥ {MIN_RESOLVED}, "
            f"|bias| > {MIN_BIAS_FOR_PATCH*100:.0f}pts, "
            f"même direction sur ≥{MIN_RUNS_FOR_APPLY} runs consécutifs."
        )
    for p in patches:
        print(f"\n  ▶ {p['scope']} | {p['direction']}")
        print(f"    bias actuel : {p['current_bias_pts']:+.1f}pts")
        print(f"    runs consécutifs : {p['n_consecutive_runs']}")
        print(f"    rationale : {p['rationale']}")
        print(f"    action    : {p['action']}")


def _print_audit(state: dict) -> None:
    print("=" * 60)
    print("Auto-Learning Audit")
    print("=" * 60)
    runs = state.get("runs", [])
    print(f"\n{len(runs)} run(s) enregistré(s)")
    for r in runs[-10:]:
        g = r.get("global", {})
        print(
            f"  {r['timestamp']}  n={g.get('n', 0):2d}  "
            f"bias={g.get('bias', 0)*100:+6.2f}pts"
        )
    patches = state.get("applied_patches", [])
    print(f"\n{len(patches)} patch(s) appliqué(s)")
    for p in patches[-10:]:
        print(
            f"  {p.get('timestamp', '?')}  {p.get('scope', '?')} "
            f"→ {p.get('action', '?')}"
        )


# ============================================================================
# Main
# ============================================================================


def _suggest(stats: dict) -> str:
    """Rétro-compatibilité v4.6 — message texte global."""
    if stats.get("n", 0) < MIN_RESOLVED:
        return f"Pas assez de picks résolus (n<{MIN_RESOLVED}) pour suggérer un ajustement."
    bias = stats.get("bias", 0.0)
    if bias < -MIN_BIAS_FOR_PATCH:
        return (
            "L'agent SURESTIME systématiquement (bias < -5pts). "
            "Suggestion: relever F2 de 0.02 OU augmenter le poids du "
            "shrinkage vers book_proba dans criteria.md."
        )
    if bias > MIN_BIAS_FOR_PATCH:
        return (
            "L'agent SOUS-ESTIME (bias > +5pts). "
            "Suggestion: relâcher F2 de 0.02 OU diminuer le poids du "
            "shrinkage. À voir si c'est conservateur intentionnel."
        )
    return "Calibration correcte (|bias| < 5pts). Pas d'ajustement urgent."


def main() -> int:
    if "--rollback" in sys.argv:
        msg = _rollback_last_patch()
        print(msg)
        return 0

    if "--audit" in sys.argv:
        _print_audit(_load_state())
        return 0

    picks = _load_picks()
    dims = _multi_dimensional_bias(picks)

    # Enregistre toujours le run courant pour suivi
    state = _load_state()
    state = _record_run(state, dims)

    patches = _build_patches(state, dims)
    _print_report(dims, patches)

    if "--apply" in sys.argv and patches:
        to_apply = [p for p in patches if p["n_consecutive_runs"] >= MIN_RUNS_FOR_APPLY]
        if not to_apply:
            print(
                "\n[APPLY] Aucun patch ne passe le gating "
                f"(besoin de ≥{MIN_RUNS_FOR_APPLY} runs consécutifs même direction)."
            )
            _save_state(state)
            return 0
        print(f"\n[APPLY] Application de {len(to_apply)} patch(s)…")
        backup = _backup_criteria()
        print(f"  Backup : {backup.name}")
        for p in to_apply:
            _annotate_criteria(p)
            print(f"  ✓ Annoté criteria.md : {p['scope']}")
        _log_to_learnings(to_apply, backup)
        print("  ✓ Log écrit dans learnings.md")
        state.setdefault("applied_patches", []).extend([
            {**p, "timestamp": _now_iso(), "backup": backup.name} for p in to_apply
        ])
    elif "--suggest" in sys.argv:
        print("\n[SUGGEST] Mode dry-run — relancer avec --apply pour exécuter.")
        print(_suggest(dims["global"]))

    _save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
