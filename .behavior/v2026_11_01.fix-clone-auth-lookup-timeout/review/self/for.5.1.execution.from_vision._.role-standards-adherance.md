# self review — role-standards-adherance — 5.1.execution.from_vision

## the rule directories checked

mechanic `briefs/practices/`:
- `code.prod/readable.comments` — what-why headers, timeless comments
- `code.prod/pitofsuccess.errors` — failfast, failloud, failhide, exit codes
- `code.prod/pitofsuccess.procedures` — immutable vars, time assumptions, magic values
- `code.prod/evolvable.repo.structure` — directional deps, no barrels, no index.ts
- `code.prod/pitofsuccess.typedefs` — no `as` casts, shapefit
- `code.test/frames.behavior` — given/when/then, useThen, no redundant expensive ops
- `code.test/pitofsuccess.errors` + `scope.integration` — failfast on absent resource, no mocks
- `code.test/pitofsuccess.portability` — `genTempDir`, hermetic, no bare host deps
- `lang.terms` / `lang.tones` / `lang.prose` — gerunds, lowercase, ubiqlang, brevity

repo `.agent/repo=.this/role=any/briefs/`:
- `rule.forbid.host-specific-cures-in-hints`, `rule.forbid.npm-in-tests`, `rule.require.thinnest-import-path`

## found, and fixed

1. **a host-specific cure in a hint** (`rule.forbid.host-specific-cures-in-hints`, blocker). the
   clamp's absent-`ss` `ConstraintError` said `e.g. apt-get install iproute2`. the row fires on
   any linux box that runs the integration tier — alpine (`apk`), fedora (`dnf`), arch (`pacman`)
   included — and no premise fixes it to debian. climbed to rung 4: `install the iproute2 package
   with your host package manager, then rerun` — names the package (the datum) and no command
2. **an unmarked mutation** (`rule.require.immutable-vars`: "isolate unavoidable mutation … with
   `.note = deliberate mutation`"). `process.env.PATH = …` in the clamp's `useBeforeAll` had a
   docblock note about scope, but not the inline marker this file puts at every mutation
   (`genServerWithCapture`'s `written` / `traced`). added
   `// .note = deliberate mutation — the fake \`ss\` must win PATH …`

rerun after both: format green; `[case19]` 5 passed.

## held

- **what-why headers** — `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS` carries `.what` / `.why` / `.note`;
  `CLONE_AUTH_GATE_TIMEOUT_MS`'s docblock kept its shape; `constants.test.ts` and `[case19]` each
  open with `.what` / `.why`. each code paragraph in the clamp has a one-line comment
- **timeless comments** — the docblocks state what IS and why; the #678 history appears as the
  durable reason ("the two were once separate literals … the derivation keeps the order"), not as
  a narrative of this session. the F7 figure is dated, as a measurement should be
- **failfast / failloud in the test** — absent `ss` throws `ConstraintError` with a hint; never a
  skip, never a silent return (`code.test/pitofsuccess.errors/rule.require.failfast`)
- **no failhide** — the `.then(ok, err)` in `useThen` captures the error to ASSERT it is null; the
  first then fails loud with the message if the say rejects. not a swallow
- **no mocks** (`rule.forbid.integration.mocks`) — the fake `ss` is a real executable that runs
  the real `ss`; the gate, exec, socket, and server are all real. a slowed dependency, not a
  replaced one
- **`genTempDir`, not raw tmpdir** (`rule.forbid.adhoc-gentempdir-reimpl`) — ✅
- **no redundant expensive op** — the 9s say runs ONCE in `useThen`; four thens read its result
- **given/when/then with `[caseN]` / `[t0]`** — ✅ in both test files
- **no `as` cast** — `(error: Error)` is a parameter annotation on a rejection handler, not a cast
- **directional deps** — `domain.operations/clone/socket/constants.ts` imports `infra/socket`,
  never the reverse; no barrel, no index.ts
- **thinnest import path** — `clone/socket/constants.ts` now imports one tiny leaf module
  (`infra/socket/constants.ts`, zero imports of its own). no graph added to any cli hot path
- **no magic values** — 60s, 5s margin, 9s delay are each named (`SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS`,
  the derivation, `SS_DELAY_SECONDS`)
- **time assumptions** — the clamp asserts a LOWER bound (`>= 9000ms`) only; no upper bound that
  a loaded CI box could break
- **lang** — lowercase prose; no gerunds (the write hook passed every file); one term per
  concept ("lookup" for the scan, "gate" for the auth wait, "bound" for each limit)
- **exit-code semantics** — no new error path in prod; the gate's deny / timeout replies are
  unchanged

## examined, accepted

- the multi-line `// .note =` comment in `getSocketPeerCred.ts` — `rule.require.what-why-headers`
  forbids multi-line `//` *paragraph titles*; a `.note` block is the repo's extant form for an
  annotation (`genCloneSocketServer.ts:337-341` uses it four times). consistent
- if `useBeforeAll` throws (absent `ss`), the `afterAll` restore reads `scene.pathBefore` from a
  scene that never built. the case is already red with a named `ConstraintError` at that point,
  and PATH was never changed (the throw precedes the swap), so no neighbour is harmed
