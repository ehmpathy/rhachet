# self review — has-pruned-backcompat — 5.1.execution.from_vision

## what i looked for

a shim, alias, re-export, deprecated name, or dual-read the change keeps "to be safe."

## what i read

- `rhx grepsafe --pattern 'CLONE_AUTH_GATE_TIMEOUT_MS|SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS|getSocketPeerCred' --path src`
  — 21 lines. the gate constant has one prod reader, `genCloneSocketServer.ts:348` and `:357`
  (the trace line interpolates the value, so it reports the new bound by itself). the lookup
  constant has one reader, `getSocketPeerCred.ts:74`
- `rhx grepsafe --pattern 'timed out after [0-9]+ms|8_?000ms' --path src` — two hits, both in
  the keyrack daemon test, unrelated windows. no snapshot or test pins the old `8000` or `5000`
- `genCloneSocketServer.ts:326-361`, the gate's comment block — it names the constant, never a
  literal, so it stays true

- a second pass, for an implicit compat: a test that leans on the OLD fast deny (a fault that
  denied within 5s, a gate that NACKed at 8s) would be compat by another name — kept green only
  because the bound stayed short
  - `rhx grepsafe --pattern "auth-denied|auth-gate-timeout" --path src --glob '*.test.ts'` — six
    lines: my own clamp and unit, plus `computeCloneOperationalRejectClass.test.ts:50,89,90`, which
    classifies the reject REASON strings and never sees a timer. no test pins the latency of a deny
  - `rhx grepsafe --pattern "auth-denied|auth-gate-timeout|same unix user" --path blackbox` — 0
    matches. no acceptance test drives a deny at all
  - `awaitCloneAuthGate` takes `timeoutMs` as input, so its own unit tests inject a bound and
    are untouched by the constant
- one consequence that is NOT compat but a reader may mistake for it: a probe that hangs up (1s
  observe, 5s baseline) now leaves its server-side lookup to run up to 60s rather than 5s. the
  lookup is read-only and its outcome is discarded once the socket is gone; F6 (abort on hangup)
  holds it, deferred by the wisher, dream caught. no shim keeps the old 5s cap for probes

## findings

- **none kept.** the literal `5000` was replaced in place; the literal `8_000` was replaced by
  the derivation in place. no old-name alias, no env override, no "legacy" branch
- **no public surface moved.** neither constant is exported from a package entry; both are
  internal. `getSocketPeerCred`'s signature is unchanged; only its option bag gained a field
  (`env: process.env`) equal to node's own default
- **the one behavior a caller can observe changed on purpose:** a slow lookup that used to deny
  at 5s now waits up to 60s. that IS the wish. a lookup in (30s, 60s) now ends as a client wedge
  rather than a deny — named in the gate docblock, deferred by the wisher (F3), caught as a dream.
  no compat path keeps the old 5s deny, and none was asked for

## open questions for the wisher

none. no compat was assumed, so none is owed a confirmation.

## the bound

the keyrack daemon's own peer lookup (`keyrack/daemon/svc/src/infra/getSocketPeerPid.ts`) has
its own bound and is out of this wish's scope; a reseed dream already holds it
(`.dream/v2026_11_01.reseed.keyrack-daemon-peer-pid-bound.md`). left untouched here, which is
scope, not compat.
