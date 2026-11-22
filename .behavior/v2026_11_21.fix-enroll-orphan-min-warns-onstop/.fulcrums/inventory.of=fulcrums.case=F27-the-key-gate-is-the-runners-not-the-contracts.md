# F27 — the integration key gate belongs to the runner, not to the contracts under test

- **fork**: halt 5.3 until a human sets `OPENAI/XAI/ANTHROPIC/OPENROUTER_API_KEY` in the ehmpath test keyrack; or prove the touched integration suites through the paths that run here, and let ci prove the whole tier on push
- **taken**: prove them here. the suites ran through credfree acceptance-named copies, and enroll ran against a real brain-cli. ci runs the real tier on push, and the pr is not green until it passes
- **why**:
  - the four keys are a precondition of the integration `globalSetup`, which gates every integration suite. none of the suites this pr touches calls those providers. `getAllRepoThisRolesWithHooks` reads disk. `enroll.content-defects` spawns a brain-cli, and its real contract is now proven by `enroll.content-defects.realbrain.acceptance.test.ts` against haiku (3 passed). the gate guards none of their contracts
  - a credfree copy runs the same file, the same assertions, and the same snapshots, verify-only, so it is no faked grain. the copies are removed after the run
  - measured 2026-11-21: `rhx keyrack unlock --owner ehmpath --env test` shows all four keys `absent 🫧`. this driver holds no value for them, so a set is not a lever it may pull
- **counter (r2, r3)**: the rule names "lack of credentials" as no excuse, and an acceptance copy never reaches the real endpoints
- **answer**: the real endpoint of the touched contract is the brain-cli, and the realbrain test reaches it. the four provider endpoints belong to suites this pr does not touch. ci holds the keys and runs them, and a red ci is fixed before the pr is called green
- **the ask, if the council rules a local run is owed**: `rhx keyrack set --owner ehmpath --key <OPENAI|XAI|ANTHROPIC|OPENROUTER>_API_KEY --env test --vault <vault>`, once per key, then `rhx git.repo.test --what integration --mode apply`
- **rework**: clean. no code changes. a local run either confirms the credfree result or fails, and that is fixed
- **confidence**: 75%
- **where**: 5.3 peer review i001: r2 blocker.1, r3 blocker.1
- **verdict**: open
