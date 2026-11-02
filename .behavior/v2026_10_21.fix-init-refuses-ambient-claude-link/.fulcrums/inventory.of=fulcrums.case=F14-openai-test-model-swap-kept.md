# F14 — the shared openai test context runs on `gpt-4o-mini-2024-07-18`, not `gpt-4-turbo-2024-04-09`

## .the fork

- **a.** revert the model line to `gpt-4-turbo-2024-04-09` (main's), keep the `ConstraintError` + hint
- **b.** keep `gpt-4o-mini-2024-07-18`, the state proven green in integration run 3 (2128/2128)

## .taken — b, for now, and why at the time

- the swap landed in b415ab0d with no reason recorded; it is unrelated to the wish (scope)
- a revert was tried on 2026-10-26, but its proof run could not start: the integration tier needs
  `ehmpathy.test.AWS_PROFILE`, whose sso session had expired, and keyrack forbids a workaround
- an unproven revert risks a red ci if the turbo snapshot is retired; the kept state has a green run

## .rework — clean

one line in `src/.test/getContextOpenAI.ts`, then a scoped run of `invokeImagineStitcher`,
`enweaveOneStitcher`, `enweaveOneFanout`, `enweaveOneRoute`.

## .confidence — 55%, and why it is low

scope says revert (peer lane enroll-verif-test-intent i004 blocker.1, and three 5.1 lanes before it);
only the absent proof holds it. once a human unlocks keyrack, the revert plus its scoped run is the
likely verdict.

## .where

- `src/.test/getContextOpenAI.ts:20`

## .verdict

settled by measurement, 2026-11-02 — b holds. the revert was made and its scoped run went red: 5 of
12 failed, each with `404 The model gpt-4-turbo-2024-04-09 has been deprecated`
(`rhx git.repo.test --what integration --scope 'path://invokeImagineStitcher' --scope 'path://enweaveOne' --mode apply`).
main's model is retired, so main's own openai suites are red; the swap is that red's cure, not scope
creep. restored, the same command passed 12/12.
