# define.invariant.clone-prune-safety

## .what

`rhx clone prune` reaps a clone **only when it is truly gone and truly ours** — a DEAD clone on
this host, past any age gate. it never reaps a LIVE clone (one a caller could still `say` to), a
DEAF clone (one still active, observe-only), or a clone whose liveness this host cannot verify.
and it is **plan-by-default**: the bare command previews, only `--mode apply` removes.

## .invariant

for every clone `prune` actually removes:

```
prune removed(clone)  ⟹  reachState(clone) = DEAD
                          ∧ host-verifiable(clone)          (its host is THIS host)
                          ∧ (olderThan = ∅ ∨ age(clone) ≥ olderThan)
                          ∧ mode = apply
```

the contrapositives are the guards that enforce it — each is a reason a clone is **kept**:

```
reachState ∈ {LIVE, DEAF}          ⟹  kept (never reaped)
clone.hostHash ≠ getHomeHash()     ⟹  kept (cross-host, unverifiable from here)
olderThan set ∧ age < olderThan    ⟹  kept (too fresh)
mode = plan (the default)          ⟹  kept (previewed, no removal)
```

so a **slip cannot destroy a reachable or a foreign clone**: the destructive act needs a DEAD
verdict, a host match, an age pass, AND a deliberate `--mode apply`.

## .why

prune is the one destructive verb in the reach surface — it deletes a clone's whole footprint
(dir, identity, socket, and the `.slugs`/`.serials`/`.exids` index entries). the pit-of-success
demands the easy path be the safe path (`rule.require.safe-by-default`):

- a **LIVE** clone is one a cron/comms handler could still be talking to — reaping it would cut a
  live conversation. so LIVE is never eligible.
- a **DEAF** clone is still an active process (observe-only). it is not "gone", so it is not
  prune's to reap — it will become DEAD on its own when its process exits (the DEAF→DEAD hinge),
  and only THEN is it eligible.
- a **cross-host** clone may be alive on its other machine; this host cannot probe its pid or its
  socket, so it must be assumed alive (`kept`), never reaped on a guess.
- **plan-by-default** means a hurried `rhx clone prune` shows what it *would* reap and removes no
  clone; the human opts into deletion with `--mode apply`.

this is the deferred `del*` cleanup-family made safe: a clone accrues, dies, and prune reaps only
the genuinely-dead-and-local, so `list` stays legible and `.agent/.actors/` does not grow
unbounded — without ever risking a reachable run.

## .evidence

- **the DEAD-only + age gate** — `src/domain.operations/clone/computeClonePruneDecision.ts`: a
  non-DEAD reach-state returns `keep`; a DEAD clone returns `prune` only when the `olderThan` gate
  (if any) passes.
- **the cross-host guard + reach probe** — `src/domain.operations/clone/getAllClonesPrunable.ts`:
  skips any clone whose `hostHash` ≠ this host, then classifies the rest by live reach-state.
- **the plan-by-default surface** — `src/contract/cli/invokeClonePrune.ts`: `--mode` defaults to
  `plan`; `delClone` runs per prunable ONLY under `--mode apply`.
- **the reap** — `src/domain.operations/clone/delClone.ts`: removes the clone dir + socket +
  every index entry, idempotently (ENOENT-safe).
- **the clamps** —
  - `computeClonePruneDecision.test.ts`: LIVE-keep, DEAF-keep, DEAD-prune, the `--older-than` gate
  - `getAllClonesPrunable.integration.test.ts`: the cross-host skip + the reach filter
  - `delClone.integration.test.ts`: the real fs removal of dir + socket + indexes
  - `blackbox/cli/clone.prune.acceptance.test.ts`: the real binary proves a LIVE keeper survives a
    plan+apply while a DEAD goner is reaped (the DEAF→DEAD lifecycle clamp), a DEAF watcher is kept
    across an apply, and the `--older-than 1h` gate holds back a fresh death (+ its bad-value error)
- **settled by** — the human wisher (2026-08-13): "and obviously mute clones should be marked dead
  once they're done" — the DEAF-is-not-reapable / DEAD-is hinge this invariant rests on.

## .enforcement

- a prune path that removes a LIVE or DEAF clone = **blocker**
- a prune path that removes a cross-host clone whose pid/socket cannot be verified from this host =
  **blocker**
- a bare `rhx clone prune` (no `--mode apply`) that deletes a clone = **blocker** (plan-by-default)

## .see also

- `define.clone-reach-states.md` — the LIVE | DEAF | DEAD model prune reads (only DEAD is reaped)
- `src/domain.operations/clone/isCloneProcessLive.ts` — the pid probe behind the DEAF↔DEAD hinge
  that decides when a socketless clone becomes prune-eligible
- `rule.require.safe-by-default` (ergonomist) — the pit-of-success this invariant instantiates
