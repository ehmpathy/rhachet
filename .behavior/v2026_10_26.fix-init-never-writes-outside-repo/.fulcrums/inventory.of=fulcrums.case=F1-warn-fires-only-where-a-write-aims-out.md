# F1 — the warn fires only where a write aims out of the repo

## .the fork
the wish: a 0444-grove init "exits 0 with a visible warn". on main, no write aims at the grove, so:
- A: no warn in that case; the warn fires only when a write's real target sits outside the repo
- B: print a note when an actor's `settings.json` chain reaches a read-only file outside the repo,
  even though naught is written

## .taken, at first
A — a warn about a write that never happened reports a non-event.

## .verdict
**conceded to B, 2026-10-26**, after peer review (experience-coverage, blocker.1): the wish states
the warn as part of its proof, and a vision may not narrow a stated requirement
(`rule.forbid.dropped-behavioral-requirements`). shaped as a note on a fact — the locked file was
reached and left alone — once per distinct target per run.

## .rework
clean.

## .where
`1.vision.yield.md` .the read-only note · `case=1`.
