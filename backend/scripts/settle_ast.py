"""libcst-based writer for picks_data.py and picks_translations_en.py.

Preserves all surrounding comments and formatting (libcst's strength
over plain Python ``ast`` which loses comments + formatting).

Two public functions:

    update_pick_outcome(picks_data_path, date, outcome, result, leg_updates=None)
    update_en_translation(translations_path, date, score_text, summary,
                         bet_outcome, leg_updates=None)

Both are **idempotent**: running them twice in a row leaves the file
byte-identical (or as close as libcst can preserve given pre-existing
trailing commas etc.).
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import libcst as cst


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_simple_value(value):
    """Convert a Python literal to a libcst expression."""
    if value is None:
        return cst.Name("None")
    if isinstance(value, bool):
        return cst.Name("True" if value else "False")
    if isinstance(value, int):
        if value < 0:
            return cst.UnaryOperation(
                operator=cst.Minus(), expression=cst.Integer(str(-value))
            )
        return cst.Integer(str(value))
    if isinstance(value, float):
        if value < 0:
            return cst.UnaryOperation(
                operator=cst.Minus(), expression=cst.Float(str(-value))
            )
        return cst.Float(str(value))
    if isinstance(value, str):
        # Escape backslash + double-quote
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return cst.SimpleString(f'"{escaped}"')
    if isinstance(value, list):
        return cst.List(
            elements=[cst.Element(value=_make_simple_value(v)) for v in value]
        )
    if isinstance(value, dict):
        return cst.Dict(
            elements=[
                cst.DictElement(
                    key=_make_simple_value(k), value=_make_simple_value(v)
                )
                for k, v in value.items()
            ]
        )
    raise TypeError(f"Unsupported literal type: {type(value).__name__}")


def _dict_get(d: cst.Dict, key: str) -> Optional[cst.DictElement]:
    """Find a DictElement whose key is the string literal ``key``."""
    for el in d.elements:
        if isinstance(el, cst.DictElement) and isinstance(el.key, cst.SimpleString):
            # Strip the quotes
            k = el.key.value
            if k.startswith(('"', "'")):
                k = k[1:-1]
            if k == key:
                return el
    return None


def _dict_get_value(d: cst.Dict, key: str):
    el = _dict_get(d, key)
    return el.value if el else None


def _dict_set(d: cst.Dict, key: str, value_node) -> cst.Dict:
    """Return a new Dict with key set/replaced to value_node."""
    new_elements = list(d.elements)
    found = False
    for i, el in enumerate(new_elements):
        if isinstance(el, cst.DictElement) and isinstance(el.key, cst.SimpleString):
            k = el.key.value
            if k.startswith(('"', "'")):
                k = k[1:-1]
            if k == key:
                new_elements[i] = el.with_changes(value=value_node)
                found = True
                break
    if not found:
        new_elements.append(
            cst.DictElement(
                key=cst.SimpleString(f'"{key}"'),
                value=value_node,
            )
        )
    return d.with_changes(elements=new_elements)


def _date_of_dict(d: cst.Dict) -> Optional[str]:
    v = _dict_get_value(d, "date")
    if isinstance(v, cst.SimpleString):
        s = v.value
        if s.startswith(('"', "'")):
            s = s[1:-1]
        return s
    return None


# ---------------------------------------------------------------------------
# picks_data.py editor
# ---------------------------------------------------------------------------


class _PicksUpdater(cst.CSTTransformer):
    """Walks the module, finds the PICKS assignment, updates one pick."""

    def __init__(
        self,
        date: str,
        outcome: str,
        result: dict,
        leg_updates: Optional[list[dict]] = None,
    ):
        super().__init__()
        self.date = date
        self.outcome = outcome
        self.result = result
        self.leg_updates = leg_updates or []
        self.found = False

    def leave_Assign(self, original_node, updated_node):
        # Only act on `PICKS: list[Pick] = [...]` — but Python types this
        # as an AnnAssign, not Assign. We handle both.
        return updated_node

    def leave_AnnAssign(self, original_node, updated_node):
        targets_match = False
        if isinstance(updated_node.target, cst.Name) and updated_node.target.value == "PICKS":
            targets_match = True
        if not targets_match:
            return updated_node
        if updated_node.value is None or not isinstance(updated_node.value, cst.List):
            return updated_node

        new_elements = []
        for el in updated_node.value.elements:
            if isinstance(el, cst.Element) and isinstance(el.value, cst.Dict):
                d = el.value
                if _date_of_dict(d) == self.date:
                    new_d = self._update_pick_dict(d)
                    new_elements.append(el.with_changes(value=new_d))
                    continue
            new_elements.append(el)

        return updated_node.with_changes(
            value=updated_node.value.with_changes(elements=new_elements)
        )

    def _update_pick_dict(self, d: cst.Dict) -> cst.Dict:
        self.found = True
        # Set outcome
        d = _dict_set(d, "outcome", _make_simple_value(self.outcome))
        # Set/merge result
        existing_result = _dict_get_value(d, "result")
        if isinstance(existing_result, cst.Dict):
            new_result = existing_result
            for k, v in self.result.items():
                new_result = _dict_set(new_result, k, _make_simple_value(v))
        else:
            new_result = _make_simple_value(self.result)
        d = _dict_set(d, "result", new_result)

        # Update legs if needed
        if self.leg_updates:
            legs_value = _dict_get_value(d, "legs")
            if isinstance(legs_value, cst.List):
                new_leg_elements = []
                for i, leg_el in enumerate(legs_value.elements):
                    if (
                        i < len(self.leg_updates)
                        and isinstance(leg_el, cst.Element)
                        and isinstance(leg_el.value, cst.Dict)
                    ):
                        leg_update = self.leg_updates[i]
                        leg_dict = leg_el.value
                        if "outcome" in leg_update:
                            leg_dict = _dict_set(
                                leg_dict,
                                "outcome",
                                _make_simple_value(leg_update["outcome"]),
                            )
                        if "result" in leg_update:
                            existing = _dict_get_value(leg_dict, "result")
                            if isinstance(existing, cst.Dict):
                                new_lr = existing
                                for k, v in leg_update["result"].items():
                                    new_lr = _dict_set(
                                        new_lr, k, _make_simple_value(v)
                                    )
                            else:
                                new_lr = _make_simple_value(leg_update["result"])
                            leg_dict = _dict_set(leg_dict, "result", new_lr)
                        new_leg_elements.append(leg_el.with_changes(value=leg_dict))
                    else:
                        new_leg_elements.append(leg_el)
                new_legs = legs_value.with_changes(elements=new_leg_elements)
                d = _dict_set(d, "legs", new_legs)
        return d


def update_pick_outcome(
    picks_data_path: Path,
    date: str,
    outcome: str,
    result: dict,
    leg_updates: Optional[list[dict]] = None,
) -> None:
    """Idempotently update the pick of given date inside picks_data.py.

    Raises ``ValueError`` if no pick matches ``date``.
    """
    src = Path(picks_data_path).read_text(encoding="utf-8")
    tree = cst.parse_module(src)
    updater = _PicksUpdater(date, outcome, result, leg_updates)
    new_tree = tree.visit(updater)
    if not updater.found:
        raise ValueError(f"No pick with date={date} found in {picks_data_path}")
    Path(picks_data_path).write_text(new_tree.code, encoding="utf-8")


# ---------------------------------------------------------------------------
# picks_translations_en.py editor
# ---------------------------------------------------------------------------


class _TranslationsUpdater(cst.CSTTransformer):
    def __init__(
        self,
        date: str,
        score_text: str,
        summary: str,
        bet_outcome: str,
        leg_updates: Optional[list[dict]] = None,
    ):
        super().__init__()
        self.date = date
        self.score_text = score_text
        self.summary = summary
        self.bet_outcome = bet_outcome
        self.leg_updates = leg_updates or []
        self.found = False

    def leave_AnnAssign(self, original_node, updated_node):
        if isinstance(updated_node.target, cst.Name) and updated_node.target.value == "TRANSLATIONS":
            if isinstance(updated_node.value, cst.Dict):
                new_d = self._update_translations(updated_node.value)
                return updated_node.with_changes(value=new_d)
        return updated_node

    def leave_Assign(self, original_node, updated_node):
        # Handle plain `TRANSLATIONS = {...}` as well
        for target in updated_node.targets:
            if isinstance(target.target, cst.Name) and target.target.value == "TRANSLATIONS":
                if isinstance(updated_node.value, cst.Dict):
                    new_d = self._update_translations(updated_node.value)
                    return updated_node.with_changes(value=new_d)
        return updated_node

    def _update_translations(self, d: cst.Dict) -> cst.Dict:
        new_elements = list(d.elements)
        for i, el in enumerate(new_elements):
            if not (isinstance(el, cst.DictElement) and isinstance(el.key, cst.SimpleString)):
                continue
            k = el.key.value
            if k.startswith(('"', "'")):
                k = k[1:-1]
            if k == self.date and isinstance(el.value, cst.Dict):
                new_inner = el.value
                new_inner = _dict_set(
                    new_inner, "score_text", _make_simple_value(self.score_text)
                )
                new_inner = _dict_set(
                    new_inner, "summary", _make_simple_value(self.summary)
                )
                new_inner = _dict_set(
                    new_inner, "bet_outcome", _make_simple_value(self.bet_outcome)
                )
                if self.leg_updates:
                    legs_value = _dict_get_value(new_inner, "legs")
                    if isinstance(legs_value, cst.List):
                        new_leg_elements = []
                        for j, leg_el in enumerate(legs_value.elements):
                            if (
                                j < len(self.leg_updates)
                                and isinstance(leg_el, cst.Element)
                                and isinstance(leg_el.value, cst.Dict)
                            ):
                                lu = self.leg_updates[j]
                                leg_dict = leg_el.value
                                for field in ("score_text", "summary", "bet_outcome"):
                                    if field in lu:
                                        leg_dict = _dict_set(
                                            leg_dict,
                                            field,
                                            _make_simple_value(lu[field]),
                                        )
                                new_leg_elements.append(
                                    leg_el.with_changes(value=leg_dict)
                                )
                            else:
                                new_leg_elements.append(leg_el)
                        new_legs = legs_value.with_changes(elements=new_leg_elements)
                        new_inner = _dict_set(new_inner, "legs", new_legs)
                new_elements[i] = el.with_changes(value=new_inner)
                self.found = True
        return d.with_changes(elements=new_elements)


def update_en_translation(
    translations_path: Path,
    date: str,
    score_text: str,
    summary: str,
    bet_outcome: str,
    leg_updates: Optional[list[dict]] = None,
) -> None:
    """Idempotently update an EN translation entry.

    If ``date`` does not exist in TRANSLATIONS, this is a no-op (the FR side
    is the source of truth; EN is an overlay).
    """
    src = Path(translations_path).read_text(encoding="utf-8")
    tree = cst.parse_module(src)
    updater = _TranslationsUpdater(date, score_text, summary, bet_outcome, leg_updates)
    new_tree = tree.visit(updater)
    Path(translations_path).write_text(new_tree.code, encoding="utf-8")
