# F28 — the `rhachet act --brain repo/rest` grammar is proven at unit and integration, not acceptance

**the fork:** (a) prove the new `--brain` grammar with a data-driven unit
(`asBrainRefFromFlag.test.ts`: the whole form, the `repo/rest` form, the fallback, and the no-slash
refusal) and a live integration row through the real `invokeAct` command
(`--brain anthropic/claude/code/haiku` against haiku) · (b) also add a subprocess acceptance suite
for `rhachet act --brain`, with a brain config fixture and snapshots.

**taken:** (a).

- `rhachet act --brain` has no acceptance suite on main for either form. the grammar is a pure
  cast: the unit test holds every branch, and the integration row proves the cast reaches a live
  brain through the real command
- a subprocess acceptance suite would need a fixture with real anthropic and openai brains
  configured, a new surface built to serve a grammar fix that rides along with a spawn-allowance pr
- the run header the integration row asserts is the same render
  `askAct.spawnDepth.acceptance` snaps for `rhachet act` as a subprocess

**rework:** clean — an acceptance suite for `rhachet act --brain` can be added on its own.

**confidence:** 80%.

**where:** `src/contract/cli/asBrainRefFromFlag.ts`, `src/contract/cli/invokeAct.ts`.

**verdict:** —
