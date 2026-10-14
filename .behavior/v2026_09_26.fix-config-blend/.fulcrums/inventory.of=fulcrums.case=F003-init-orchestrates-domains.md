# fulcrum F003 — init composes the operations of the domains it orchestrates

## .the concern

`arch-smell-scopeleaks-src` blocker.2 (r009, i004.e7bc94af): the `init` context (hooks, boots)
imports `actor/enrolled`, `brains` and `enroll` operations directly; the lane asks that they route
through a contract or shared interface so init depends on a boundary, not on those contexts'
internals.

## .the facts, measured against the code

- `init` is an orchestrator. at HEAD (`4216d590`, #557 — the base this PR builds on), it already
  composes eight other domains by their operation files: `actor/enrolled` (`getActorOndiskDir`,
  `getAllActorsOndisk`, `getBrainOndiskDir`, `isActorActive`), `boot` (`setBrainDirBoot`, the
  report lines), `brains` (three hook ops), `enroll` (`assertBrainCliVersionFloor`), `config`,
  `manifest`, `invoke` and `upgrade` (`git grep "from '@src/domain.operations/" HEAD --
  src/domain.operations/init`)
- no domain under `src/domain.operations/` has an `internal/` tier or a barrel contract. each
  operation file IS its domain's public surface; the rule's own example of a leak is a reach into
  `customer/internal/validate`
- every edge init holds points down: init → enroll → actor, init → clone → actor, init → brains.
  no edge points back into init
- the true leak in this lane, blocker.1, was a CYCLE (actor ↔ enroll and actor ↔ boot, both new in
  this PR; actor ↔ clone, already at HEAD), and all three are fixed: `asActorRolesRederived`, `asDeltaActorOutcomes`, `setActorSettingsDerived` and
  `setDeltaActorsOndisk` moved to `enroll/`, `isActorActive` to `clone/`. `actor/` now reads no
  domain above it (grep `from '@src/domain.operations/(boot|init|enroll|clone)/'` in
  `src/domain.operations/actor` → 0)

## .why it is fine to continue

a contract in front of each domain would be a re-export of the very operations init calls today —
a pass-through with no logic of its own, and a pattern no other domain in the repo follows. it
would add a layer to every init change and remove no dependency. the direction of every edge is
what the rule's "directional dependency" check guards, and it holds.

## .the same question, one grain smaller — `boot` reads `REPO_ACTOR_EXID`

`arch-smell-scopeleaks-src` nitpick.1 (r009, i004.e7bc94af) asks the same of `boot`, which reads
the repo actor's exid constant from `actor/enrolled/constants`. it is the same shape and the same
answer: boot → actor is a downward edge; with `asDeltaActorOutcomes` moved, actor reads naught of
boot, so no cycle remains; and the repo actor's exid is the actor domain's own vocabulary, so a copy
of it outside that domain would be a second source of truth that could drift.

## .what the council decides

whether rhachet's domains should gain a contract tier (a repo-wide change, its own PR), or init
keeps the orchestrator shape it already has at HEAD. the driver holds the latter.
