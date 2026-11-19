# F18 — an actor names at most one `@ref` base

- **fork** — the vision's edge table lists *two `@ref` bases with different brains, no local `brain:` → fail fast, names both brains*, which presumes an actor may name more than one base. (a) refuse any second base at validate (`names more than one base`) · (b) accept many bases: union their roles, and refuse only an ambiguous brain
- **taken** — (a). one base keeps the role arithmetic and the brain propagation (F11) a straight line: `base ⊕ delta`, the same shape the derived-actor form `slug=<base>._.delta=<h>` names on disk. many bases would need a merge order for `-role` deltas across bases and a dir name for a multi-base derived actor, neither of which the vision settles. (a) is the strict subset: every manifest valid under (a) stays valid under (b), so a later (b) breaks no repo
- **rework** — clean — the refusal becomes a union plus the brain-ambiguity check the vision already describes
- **confidence** — 70%; the vision's two-base row is the wisher's text, so it stays flagged for the wisher, never dropped
- **where** — `src/domain.operations/actor/manifest/asActorDeclared.ts` (the `countBase > 1` refusal); raised by behavior-intent-coverage nitpick.1
- **verdict** — unruled; best guess taken
