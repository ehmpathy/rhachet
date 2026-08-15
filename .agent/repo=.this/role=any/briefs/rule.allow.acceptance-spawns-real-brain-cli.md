# rule.allow.acceptance-spawns-real-brain-cli

## .what

acceptance tests for `rhx enroll` and `rhx clone` are **authorized** to invoke and spawn a
**real** brain-cli (a real `claude` process), boot it under a real pty, dispatch real `say`
messages into it, and read its real `get` output back. this is not only permitted — for the
reach surface it is **required** (`rule.forbid.faked-or-quarantined-acceptance`).

## .why

- the whole point of the enroll/clone reach surface is that a real brain-cli boots under our
  managed pty, receives our dispatched bytes as if a human typed them, acts on them, and its
  own reply reads back. only a **real** claude proves that contract end to end.
- a stub brain proves the MECHANISM (bytes on a socket, a transcript on disk) but NOT the
  INTEGRATION. the stub reads raw bytes as a submit; a real claude's interactive TUI does not.
  a stub-only "acceptance" test is green while the real contract is broken — the exact false
  confidence that let a real `say` never-actually-submits bug hide (the dogfood of 2026-08-12).
- so acceptance tests MAY and SHOULD spawn a real claude. the cost (a real token spend, boot
  latency, LLM nondeterminism) is managed WITHIN the test — one shared spawn across turns
  (`useBeforeAll`), a deterministic marker the prompt asks the brain to emit (never the
  nondeterministic prose), a bounded wall-clock — NOT by demotion to a stub or exile to a
  separate nightly config.

## .how to apply

- an acceptance test that needs the reach contract enrolls a **real** claude through the outer
  pty (`enrollRealClaudeAndWaitReach` / `spawnRhachetCliBackground`), `say`s into it, and polls
  `get` for a deterministic marker. see `blackbox/cli/clone.joker.realbrain.acceptance.test.ts`.
- the real brain is credential-gated. an absent brain/credential **fails LOUD**
  (`ConstraintError`, exit 2) that names the fix — it NEVER skips and NEVER silently passes
  (`getRealClaudeOrThrow`, `rule.require.failfast`).
- the test runs in the **one** acceptance gate (`jest.acceptance.config.ts`), never a separate
  `.real` config. there is no `test:acceptance:real`.
- a fresh fixture dir must pre-accept claude's one-time folder-trust gate
  (`trustFolderForRealClaude`) — the same `hasTrustDialogAccepted: true` a real user leaves after
  they trust a project once — else a real claude hangs on the trust prompt with no keyboard behind
  the pty. this is NOT a fake of the brain (real claude still boots + thinks); it clears an
  onboarding gate the user would have cleared.

## .the test

"if the real brain-cli integration broke — a `say` that never submits, a `get` that reads an
empty history — would the default acceptance gate go red before merge?"

- yes → a real acceptance test spawns the real brain in the default gate. good.
- no (a stub would still pass) → forbidden. the reach surface is unproven.

## .see also

- `rule.forbid.faked-or-quarantined-acceptance` — no stub-as-acceptance, no quarantine config
- `rule.require.playtest-via-real-dogfood` — the byhand twin: prove via the real product
- `blackbox/.test/infra/enrollCloneHarness.ts` — `getRealClaudeOrThrow`, `enrollRealClaudeAndWaitReach`,
  `sayAndPollForMarker`, `trustFolderForRealClaude`
