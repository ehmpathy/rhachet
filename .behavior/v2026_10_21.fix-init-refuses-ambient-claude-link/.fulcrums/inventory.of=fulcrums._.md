# inventory.of=fulcrums

axis = `case` (one entry per best-guessed call, in the order made). each one is the commander's to rule
(seed S1: a question that changes the behavior goes to the commander).

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | `case=F1-failed-role-counts-as-linked` — a role whose init failed keeps its link and its hooks | clean | open | 70% |
| F2 | `case=F2-prune-only-under-hooks-flag` — a part-way failure prunes hooks only under `--hooks` | clean | open | 80% |
| F3 | `case=F3-global-rhx-skew-named-not-refused` — a global rhx that differs from the pin is named, never refused | clean | open | 75% |
| F4 | `case=F4-roles-ehmpathy-pin-bump-in-scope` — the `rhachet-roles-ehmpathy >= 1.39.5` bump rides this pr | clean | answered by logic (open to strike) | 95% |
| F5 | `case=F5-stop-at-first-failed-role-or-continue` — a failed role init stops the loop (extant), rather than the loop goes on | clean | open | 60% |
| F6 | `case=F6-link-refusal-moves-ahead-of-role-loop` — a `.claude` link that aims elsewhere is refused in the preflight, before any role writes through it | clean | open | 65% |

gaps: cause 4 (director tree link layout) holds no fulcrum — it is a fact owed by the director, not a call.
