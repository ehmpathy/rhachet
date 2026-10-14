# F002 — the delta sweep cannot leave `rolesDelta` out of step with `roles`

## .the concern

`enroll-impl-behavior-intent` (i021 r019 blocker.2), relayed from i020 r020: `setDeltaActorsOndisk`
reads `rolesDelta` unlocked, then its locked write compares against a stale precomputed value, so a
concurrent `rhx enroll` could leave `actor.json` with a `rolesDelta` that no longer matches its `roles`
and roll `settings.repo.json` back, silently. the reviewer could not check it against source.

## .the stance — disputed, from the source

`src/domain.operations/enroll/setDeltaActorsOndisk.ts`:

- **`rolesDelta` is the actor's identity.** the dir name digests it: `genEnrollmentHashOfDelta` =
  `sha256({ brain, base: 'ambient', delta })` (`define.enrollment-identity-is-the-roleset-hash`). a
  concurrent enroll of this actor carries the same delta by construction; a different delta is a
  different dir. no writer can move it
- **the locked write takes `rolesDelta` from the record read under the lock**
  (`setActorManifestRolesRecorded`: `rolesDelta: manifest.rolesDelta`), never from the read before it
- **`roles` derive from that fixed delta and the ambient set.** a concurrent enroll derives from the
  same ambient set and writes the same roles; the locked write sees them equal and skips
- the one divergence left is an enroll that read the ambient set before an init moved it — the general
  init-vs-enroll race. the last writer wins, and the next init or enroll re-derives from the current set
  (`inventory.of=requirements.case=2`), so no stale state holds past the next sweep

## .what the council rules

whether the general init-vs-enroll race, which converges at the next sweep, needs a lock across both
commands. this diff does not widen it.
