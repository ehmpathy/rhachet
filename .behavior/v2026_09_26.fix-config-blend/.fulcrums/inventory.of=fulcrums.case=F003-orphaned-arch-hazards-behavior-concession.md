# F003 — the `arch-hazards-behavior` concession is orphaned, and its concern is fixed

## .the concern

`arch-hazards-behavior` blocker.1, conceded urgent (last at i010): `genBrainCliConfigArtifact` wrote
the actor's `settings.repo.json` from the repo actor's without a lock, so a hook a concurrent shield
wrote could be dropped by the whole-file write.

## .the stance — fixed, and no round of this lane can ever confirm it

- **fixed in i010.** `genBrainCliConfigArtifact` reads the source and writes the target under both
  files' locks, the source's first. proof: `genBrainCliConfigArtifact.integration` [case6] — a peer
  holds the lock and writes a hook; the derivation waits, then keeps the peer's hook beside its
  excludes (yield, i010 line)
- **the lane is gone.** the guard split `arch-hazards-behavior` into `arch-hazards-behavior-src` and
  `arch-hazards-behavior-rest` (each narrowed to fit the window, wisher 2026-10-05). no round of the
  old slug can run, so the concession stays live forever: `route.guard.budget --peer
  arch-hazards-behavior` refuses with `peer reviewer not found`
- **the successor lanes approve it.** `arch-hazards-behavior-src` (r13) approved 0 blockers at i017,
  10/10 rounds; `arch-hazards-behavior-rest` (r14) approved 0 blockers, 5/5
- the guard gap is filed as `ehmpathy/rhachet-roles-bhuild#443` (gap 1: an orphaned concession never
  clears)

## .what the council rules

that the concern is closed by the i010 fix and its successor lanes' approval.
