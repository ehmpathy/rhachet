# F6 — an abandoned probe's `ss` scan is not killed when its peer hangs up

- **fork**: with the lookup bound at 60s, a probe that gives up at 1s or 5s leaves its server-side
  `ss -xp` scan alive until `ss` exits. the say's observe loop opens a probe every ~1.25s, so on a
  slow box scans pile up (~T / 1.25 at once, for `ss` time T). either (a) abort the gate's exec
  when the socket closes, in this behavior, or (b) ship the bound change alone and defer the abort
- **taken**: (b). the wish asks for the two bounds; an abort threads an `AbortSignal` from the
  socket's `close` through `isCallerSameUser` into `getSocketPeerCred`'s exec, a contract change
  with its own clamp. the pile-up is bounded (each scan ≤ 60s) and short-lived (the observe loop
  exits once the transcript rises)
- **rework**: clean — the abort is additive; no code built on top of its absence
- **confidence**: 70% — the pile-up feeds the very load that slows `ss`; a wisher who weighs that
  higher would want (a) in this PR
- **where**: `getSocketPeerCred.ts` (exec `signal`), `isCallerSameUser.ts`,
  `genCloneSocketServer.ts:343-349` (socket `close`)
- **verdict**: settled by the wisher, 2026-11-01 — defer (seed S2); caught as dream `v2026_11_01.reseed.clone-auth-abort-lookup-on-hangup.md`
