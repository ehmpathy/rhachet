# F10 — the gate's own `timeout` path is proven at the unit grain, not by a 65s server clamp

## .the fork

a peer reviewer (i003, behavior-intent-coverage, nitpick.3) asked for the vision's edge case
"the lookup never settles → the gate fires, `auth-gate-timeout`" to be clamped at the server, with
the gate bound made injectable on `genCloneSocketServer` the way `bindTimeoutMs` is.

or rely on the extant unit proof of the gate, plus the constant-order test, and add no server seam.

## .taken

rely on the extant proof.

- the gate's timeout path is `awaitCloneAuthGate`, and its bound is already injected there:
  `awaitCloneAuthGate.test.ts [case4]` hands it a check that never settles and a 120ms bound, and
  asserts `verdict: 'timeout'`, `fault: null`, and that the elapsed time reached the bound
- the server maps `timeout` to `auth-gate-timeout` in code this PR does not touch
- what this PR changes is the VALUE of the bound and its order above the lookup bound; those are
  pinned by `constants.test.ts` (gate > lookup, lookup = 60s)
- a new server-level seam would add an option to a prod constructor for one test

## .rework

clean. a `authGateTimeoutMs` option on `genCloneSocketServer`, defaulted to the constant, plus one
clamp shaped like `[case14]`.

## .confidence

80% — the unit proof covers the mechanism; the server-level map is unchanged code. a reviewer could
still want the end-to-end NACK pinned.

## .where

- `src/domain.operations/clone/socket/awaitCloneAuthGate.test.ts [case4]`
- `src/domain.operations/clone/socket/constants.test.ts`
