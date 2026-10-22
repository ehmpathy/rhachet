# F25 — `invokeAct`'s integration rows read the run header through a passthrough console spy

**the fork:** (a) keep `jest.spyOn(console, 'log')` as a passthrough recorder, documented inline
(`.mock` / `.why` / `.real`) · (b) thread a log sink into `invokeAct`, so the test reads a sink ·
(c) run `rhachet act` as a subprocess and read its real stdout.

**taken:** (a).

- the spy replaces no behavior: `console.log` still prints, and the brain, the skill and the cli
  run for real. it records only. what `rule.forbid.integration.mocks` guards against — a double
  that answers in place of the real service — is absent
- (b) changes a published command's internal contract to serve one test, a refactor beyond a
  spawn-limit wish; (c) is the acceptance tier's job, and `askAct.spawnDepth.acceptance` already
  drives `rhachet act` as a subprocess and snaps its stdout
- the rows this pr touches (the codex swap, the `--brain anthropic/claude/code/haiku` row) keep
  the shape the suite already had

**rework:** clean for this pr — (b) is a sink parameter and a test swap, whenever `invokeAct`
gains a log context.

**confidence:** 80%. `genCloneSocketServer.integration`, one suite over, chose a sink over a spy;
whether a passthrough spy counts as a mock is the council's call.

**where:** `src/contract/cli/invokeAct.integration.test.ts`.

**verdict:** —
