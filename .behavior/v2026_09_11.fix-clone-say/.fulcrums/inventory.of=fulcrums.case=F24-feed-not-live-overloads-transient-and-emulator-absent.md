# F24 — `feed-not-live` overloads a transient cause and a permanent one, over a distinct `feed-absent` slug

**rework** clean · **status** OPEN · **confidence** 66%

## .the fork, stated fairly

`feed-not-live` is emitted for TWO states with different remedies:

- **transient** — a real feed exists but has not received its first chunk. the remedy is to WAIT; the
  first output attaches it (`genCloneScreenFeed.ts:152`).
- **permanent** — the clone has no `@xterm/headless` emulator at all, so `genBrainCliPtyClone.ts:143-145`
  injects `() => ({ live: false, reason: 'feed-not-live' })` for the clone's whole life. a WAIT never
  attaches a feed that does not exist.

| option | cost |
|---|---|
| **A** — one `feed-not-live` slug names both; the copy states both causes + both remedies (wait; if it recurs, re-enroll on a build that carries the emulator) | one slug carries two causes, so no copy is single-cause — a reviewer reads it as a cause-vs-remedy blur |
| **B** — a distinct `feed-absent` (permanent) slug beside `feed-not-live` (transient), so each is single-cause | a closed-set + WIRE contract change: `CloneScreenUnfed.reason`, `CloneProbeBlindReason`, `CLONE_PROBE_BLIND_REASONS`, `isCloneProbeBlindReason`, REASON_COPY, DEGRADE_COPY, the wire parse, and V8's declared `reason` set + its snapshots |

## .taken, and why

**A, for this stone.** the honest copy names both causes and gives each its remedy, so the user-faced
line is correct for both — the specific friction the r001/r009 nitpick named (a wait that over-promises
for the emulator-absent clone) is closed. B is the cleaner END state, but it is a closed-set change to
a WIRE contract (V8's `reason` set), so it belongs with the reason-taxonomy family rather than a
best-guess here.

## .rework, and why

**clean** — B is additive (a new slug, no caller broken by an unread value), same shape as F23. but it
touches the same wire-emitted closed set F20 and F23 do, so the three should be ruled together: a single
reason-taxonomy PR that settles the `feed-faulted` cross-set collision (F20), the present-but-unknown
wire default (F23), and this transient-vs-permanent split (F24) at once, over three piecemeal edits to
one closed set.

## .confidence 66%, and why it is low

the emulator-absent branch is a defensive lazy-load-failure path (V5 makes `@xterm/headless` a prod
dep, so in the shipped product the module is always present). so B splits a slug whose permanent cause
never fires in a healthy install — real, but low-frequency, which is why the honest one-slug copy is a
defensible place to halt and B is a tidy-later call rather than a live defect.

## .where

- `src/domain.operations/clone/pty/genBrainCliPtyClone.ts:143-145` — the injection that emits `feed-not-live` for the emulator-absent clone
- `src/domain.operations/clone/screen/genCloneScreenFeed.ts:36,152` — the `CloneScreenUnfed.reason` closed set and the transient emit
- `src/domain.operations/clone/socket/computeCloneSayReport.ts` — REASON_COPY / DEGRADE_COPY, the copies that carry both causes today
- `…case=F20….md` · `…case=F23….md` — the reason-taxonomy family this rules with

## .the demos that RENDER this call

NONE. no `case=N` demo renders a `feed-absent` slug or the emulator-absent injection; the vision's
demos consume `feed-not-live` only in its transient sense. so a verdict here changes no demo.

## .the verdict

unruled.
