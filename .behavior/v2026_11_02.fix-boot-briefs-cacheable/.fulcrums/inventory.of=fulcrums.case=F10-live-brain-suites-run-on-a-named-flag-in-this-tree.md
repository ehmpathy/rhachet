# F10 — the live-brain integration suites run on a named flag, fixed in this tree

## .the fork

this tree met 13 integration reds: live-brain act/ask suites that time out on the test key, and weave
suites on a retired model. a peer review asks that they leave this change and that the flag gate be
re-weighed against `philosophy.verification-strictness`.

- **A** — fix them here: a live-brain `then` runs only on `LIVE_BRAIN=1`; the weave suites move to a live
  model
- **B** — split them into a change of their own, and leave this tree red until it lands

## .taken

A, by the wisher's verdict (S2): these reds are met in this tree, so they are this tree's to fix; the
live-brain suites skip unless a named flag targets them, and a key is never asked for. the flag is a
declared opt-in for a paid call, not a probe that hides an absent resource, and
`rule.require.live-brain-tests-run-on-a-named-flag` states that boundary. the dependency bumps ride along
by `rule.require.git-release-confidence`.

## .rework

clean — the gate is one `runIf(RUN_LIVE_BRAIN_TEST)` per suite and one shared constant; a split is a
cherry-pick of those files.

## .confidence — 85%

settled by the wisher; the residual is whether the director reads the strictness brief as a bar to any
opt-in flag.

## .where

- `src/.test/infra/RUN_LIVE_BRAIN_TEST.ts`
- `.agent/repo=.this/role=any/briefs/rule.require.live-brain-tests-run-on-a-named-flag.md`
- `src/.test/getContextOpenAI.ts`

## .verdict

A, by the wisher (S2)
