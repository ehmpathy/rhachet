# F15 — main's ten codex `.skip` calls stay in place until the openai supplier repins its model

## .the fork
- A: unskip them on this branch and make them pass here — swap the model, mock the brain, or vendor a
  patched supplier
- B: leave them as main has them, owe the fix to the supplier repo (`ehmpathy/rhachet-brains-openai#29`),
  and record the gap in a dream

## .taken = B, and why
- the skips predate this branch: `git diff origin/main...HEAD` and the worktree diff touch none of the
  eight files that hold them (`actorAsk`, `actorAct`, `invokeAct`, three `genActor.brain.case*`)
- unskipped, each fails at `404 model_not_found` for `gpt-5.1-codex-max`, the model
  `rhachet-brains-openai@0.3.1` pins. 0.3.1 is the latest published version (measured 2026-10-19)
- every route to green here is unsafe or unclean: a model swap edits a supplier's pin from a consumer;
  a mock fakes the very brain the tests exist to prove (`rule.forbid.integration.mocks`); a vendored
  patch forks the supplier. each also ripples well outside a settings-layout fix

the repair lives at the source: the dispatched issue, and `dreams/v2026_10_17.fix.codex-brain-skips-wait-on-a-reachable-model.md`
for this repo's half (unskip once a release repins).

## .against `rule.require.external-contract-integration-tests` (peer r3, 5.3)
- the rule binds the repo that owns the external contract. the openai sdk call is made in
  `rhachet-brains-openai` (`invokeCodex`, `dist/index.js:1459`); rhachet calls a brain plug, never the
  openai api. the real test for that contract belongs in the supplier, and the dispatched issue owes it
- rhachet's own contract with a brain plug holds real-brain proofs today, on the anthropic supplier:
  `brain-config.grove-vs-repo.realbrain`, `brain-dir-boot.journey`, `enroll.shared-brain-auth`
- the gate the rule names ("get them, or fail the gate") is the wisher's to hold or lift for a defect
  that predates this branch, in files it never touched — hence a fulcrum, never a silent pass. the
  yield leaves the box unchecked

## .rework = clean
an unskip is a one-line change per call, once the supplier publishes a reachable model.

## .confidence = 85%, low because
the wisher may want the skips gone on this branch regardless — say, by a pin to a model that answers
today — and that call is theirs.

## .where
`src/domain.operations/actor/actorAsk.integration.test.ts` · `actorAct.integration.test.ts` ·
`src/contract/cli/invokeAct.integration.test.ts` · `src/contract/sdk/genActor.brain.case{Collocated,Askable,Published}.integration.test.ts`

## .verdict
owed — for the wisher at the close.
