# requirement: an init role delta reaches every actor delta'd from the ambient set

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

an actor enrolled as the ambient roles ⊕ a delta (e.g. `rhx enroll claude --roles -driver`) holds
that **delta**, and re-derives its roles from the current ambient set at each `rhx init` and each
spawn.

so after `rhx init --roles -xyz`, an extant `-driver` actor drops `xyz` too — its roles, its
`boot.md`, its `settings.of.repo.json` — and its clones read the change. not merely the next enroll.

## .why

a `-driver` actor stands for "the repo's roles, minus driver". when the repo's roles change, so does
what it stands for. a frozen copy of the roles at enroll time drifts from the repo the moment the
ambient set moves — the same drift the sync invariant forbids within one actor
(`define.actor-clone-hierarchy`).

## .clamp — landed 2026-10-02

- **identity** — `asActorRolesDelta` reads the delta off an incremental enroll spec; a delta actor's
  exid is `hash=genEnrollmentHashOfDelta({ brain, rolesDelta })`
  (`asActorOndiskExidForHash`), so the ambient set may move and the actor stays one. an absolute
  enroll (`--roles mechanic`) keeps the concrete-roles hash, unchanged
- **record** — `findsertActorOndisk` writes `rolesDelta` into `actor.json`; `getActorOndiskManifest`
  reads it, absent → null
- **re-derive** — `setDeltaActorsOndisk` runs in `syncBootsForBrainDirs` (init, upgrade,
  `roles link`), after the repo actor and before the active-actor sweep. for each delta actor, active
  or not, it re-derives the roles (`asActorRolesRederived`, the same incremental derivation enroll
  runs) and, where they moved, rewrites `actor.json` and `settings.of.repo.json`. the sweep then renders
  each active actor's `boot.md` from the fresh roles; an inactive actor renders at its next spawn
- a delta on a role no longer linked is dropped at re-derive, so a `+xyz` actor drops `xyz` with the
  repo rather than fail the init

before this, a hash actor froze its concrete roles and its identity was their hash: after
`rhx init --roles -xyz`, the next `-driver` enroll landed in a **new** actor, the extant one kept `xyz`,
and while one of its clones lived, init exited 2 (`a role no longer linked: xyz`,
`brain-dir-boot.journey` [t5]).

⚠️ **migration** — an actor enrolled with a delta before this landed has no `rolesDelta` in its
`actor.json` and a concrete-roles hash. it reads as an absolute actor: it keeps its roles, and the next
`-driver` enroll mints the delta actor beside it. its clones still reach it; it needs no rewrite.

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/enroll/asActorRolesRederived.test.ts` — re-derive, the delta read, and the exid that holds across an ambient move | ✅ green 2026-10-02 |
| integration | `src/domain.operations/enroll/setDeltaActorsOndisk.integration.test.ts` — a `-omega` actor drops `zeta` from `actor.json` and `settings.of.repo.json` when `zeta` leaves; an absolute actor is untouched; a second sync moves no actor | ✅ green 2026-10-04 |
| acceptance | `blackbox/cli/enroll.acceptance.test.ts` [case7c] — a `--roles -architect` actor, then `init --roles -driver`: init exits 0, the actor's `actor.json` and `settings.of.repo.json` drop driver, and a re-enroll lands in the same actor | ✅ green 2026-10-04 |
| acceptance | `blackbox/cli/init.delta-live.acceptance.test.ts` — the same with a LIVE clone (the stub brain stands up its socket, so the init's sweep reads the actor active): the actor's `boot.md` re-renders without driver, its record drops driver, and the clone still reads LIVE | ✅ green 2026-10-04 |

all four rows are green, so the entry is `proven`. the spawn path needs no row of its own: a
spawn reads the actor's `actor.json` and `settings.of.repo.json`, which the integration and both
acceptance rows assert are re-derived, and the [case7c] re-enroll spawns from them.

## .source

the wisher, 2026-10-02 (`v2026_09_26.fix-config-blend` seed 24): *"verify that `rhx init -xyz` will
propogate throughout all the actors that were delta'd from the default"* — decided as **re-derive
delta actors**, over "new enrolls only".
