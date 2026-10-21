# F20 — the codex brain skips stay skipped, at a model wall

## .the fork

5.3's zero-skip scan found 11 skipped test rows outside this diff, all of a real `openai/codex`
repl: `genActor.brain.case{Published,Collocated,Askable}` (6), `actorAsk` (2), `actorAct` (1) and
`invokeAct`'s real-brain case (2 brain rows).

- (a) unskip them and make them pass here, on the codex models the supplier offers
- (b) unskip them and leave them red, so the gap shows in ci
- (c) keep them skipped as they were on main, with a note at each skip that names the measured
  wall, a caught dream, and this row
- (d) swap their brain to another supplier the test key does reach (the in-repo anthropic repl),
  so they run again

## .taken — (d), plus one real openai row

taken (d) after the 5.3 i002 round, where three lanes held that a model wall is no exemption from
`rule.require.external-contract-integration-tests`. each brain row runs on `claude/code/haiku`
(`rule.require.test-claude-cli-against-haiku`): 29 passed, 0 skipped, across the 7 suites. the
openai contract keeps one real row: `invokeAct` `--brain openai/codex` reaches the openai service
and asserts its `model_not_found` refusal, which also proves `--brain` routes to the named brain.
`casePublished` [t3] now names `openai/codex` as the brain outside the allowlist.

## .taken first — (c), and why at the time

(a) was tried on every row, on all three codex models (`max`, `mini`, `5.2`). the six sdk rows, `actorAsk` [case1], `actorAct` [case1] and both
`invokeAct` brain rows were each unskipped and run. every one went red on one cause:
`rhachet-brains-openai@0.3.1` maps `openai/codex` to `gpt-5.1-codex-max`, and the ehmpath test key
answers `404 model_not_found`. the one other model it offers, `openai/codex/5.2`, answered the
same 404. `actorAsk` [case2] shares [case1]'s brain. so a pass needs a model grant on the account
or a supplier bump, and neither is in this wish.

(b) would leave a red tier on a cause this repo does not own, and would block a merge on it.

(d) would make the rows run, but it changes what 11 tests exercise, from the openai supplier to
the anthropic one, and adds a real claude spawn per row to the integration tier in ci. that is a
choice about the suite's suppliers and its cost, not about spawn depth.

one row sat under the same skip and needs no brain: `invokeAct`'s "brain not in allowlist" refusal.
the skip moved down to the two brain rows, so it runs again.

the rows were skipped on main with no reason given. now each names its measured run and points
to `.dream/v2026_10_20.fix.sdk-codex-brain-tests-unreachable-model.md`.

## .rework

clean. (a) once a model is reachable: drop the skips, per the dream. (d): swap the slug in 11
rows.

## .confidence — 90%, and why not higher

each row was measured, so the wall is real. the 404 cannot tell an absent model from an absent
grant, and (d) may be the cheaper cure if the account cannot be granted a codex model.

## .where

`src/contract/sdk/genActor.brain.case*.integration.test.ts` ·
`src/domain.operations/actor/actor{Ask,Act}.integration.test.ts` ·
`src/contract/cli/invokeAct.integration.test.ts`

## .verdict

taken (d), for the council. (a) stays the cure for full openai coverage once a codex model is
reachable (the dream).
