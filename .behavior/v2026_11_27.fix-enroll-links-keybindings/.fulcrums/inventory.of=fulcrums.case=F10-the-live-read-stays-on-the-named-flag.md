# fulcrum F10: the live read stays on the named flag

## .the fork

a peer (5.3, r3) held that the one external fact this change rests on, that claude reads
`keybindings.json` from its config dir, is proven only by a suite ci does not run.

- **A** keep `enroll.keybindings.realbrain` under `describeBrainLiveOnDemand`, run by
  `rhx test.acceptance.brainlive`
- **B** run it in the default acceptance tier
- **C** add a lack-of-credential case to the suite

## .taken: A

- `rule.require.live-brain-tests-run-on-a-named-flag` sets the gate: a suite whose asserts need a
  live answer from the paid test key runs only on `BRAIN_LIVE_SCOPE=all`. a default-run live test is
  a blocker there. B breaks that rule
- the gate is a declared opt-in, not a credential probe, so it is no failhide. under the flag the
  suite fails loud on an absent credential: `genIsolatedClaudeHome` throws a `ConstraintError` with
  a hint when no `~/.claude/.credentials.json` and no `ANTHROPIC_API_KEY` exist, and on a claude
  below the pinned version
- C would test `genIsolatedClaudeHome`, shared infra that every realbrain suite passes through. a
  case for it belongs with that infra, not with one consumer
- I ran the suite: 3 passed, 0 skipped, claude 2.1.332, haiku

## .rework: clean

drop the wrapper for B, or add one `then` to the infra's own tests for C.

## .confidence: 85%

a claude release that stops the config-dir read passes ci until someone runs the live suite. the
pr body names this, and names the command.

## .where

`blackbox/cli/enroll.keybindings.realbrain.acceptance.test.ts`;
`blackbox/.test/infra/genIsolatedClaudeHome.ts:188`.

## .verdict

open — for the commander, with the pr.
