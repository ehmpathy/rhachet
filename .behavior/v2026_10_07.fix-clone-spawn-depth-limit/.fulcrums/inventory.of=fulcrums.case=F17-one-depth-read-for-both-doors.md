# F17 — one depth read for both doors, and a smudged host marker reads loose

## .the fork

r011 (i004) raised two shape points on `asCloneSpawnDepth`:

- **(a)** keep one transformer with a `door` input, and let a host marker with no parseable
  `depthMinted` fall to the no-tty rule (one level loose)
- **(b)** split it into `asCloneSpawnDepthOfEnroll` and `asCloneSpawnDepthOfRepl` over a shared parse
- **(c)** read the host marker once via `isCloneDetachedHost`, and throw a `MalfunctionError` when a
  marker carries no minted depth

## .taken, and why at the time

**(a)**.

- the transformer exists so that the two doors cannot disagree on who is top-level (its `.why`,
  first bullet). two ops put that rule in two places, the drift it was made to stop
- a fault on a smudged marker contradicts the transformer's own smudge note: a cosmetic env smudge
  must never become a spawn that cannot run. the loose read mints depth 1, which the limit then
  refuses at the next spawn, so it is never a reset to 0
- the second marker read in `invokeEnroll` drops the handoff keys after the depth read (F15); the
  two reads see one env, in one call

## .rework

clean. (b) is two exports and their callers; (c) is one helper and one throw.

## .confidence — 80%, and why it is low

(b) is a readability call, and the reviewer reads it the other way. (c) trades the smudge rule for a
loud fault on a state no code path writes, which the council may prefer.

## .where

`src/domain.operations/spawn/asCloneSpawnDepth.ts` · `src/contract/cli/invokeEnroll.ts`

## .touched by #600

the evidence (the `.why` of `asCloneSpawnDepth.ts`, in `spawn/`) — no; #600 did not touch
`spawn/`. the enroll caller of that read, `setCloneHostHandoffConsumed` in `invokeEnroll.ts` —
yes; #600 rewrote that file. **re-verified on the rebased tree:** the caller merged clean, one
read and then the consume, in one body, so the order stays structural. `enroll.acceptance` 195/195.

the tty half of the read changed after the rebase (F13): a tty mints 0 only with no depth var,
at the enroll door. one transformer still serves both doors, so the change landed in one place.

## .verdict

open — for the council.
