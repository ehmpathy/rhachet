# F2 — suppliers own their real contract tests

## .the fork

- (a) keep a real call per supplier in rhachet: a live xai atom in `caseAskable` (with its
  `XAI_API_KEY` check and prose-theme asserts) and a live openai codex call in `invokeAct`
- (b) mock both in rhachet; each supplier's real contract is proven in the supplier's own repo, and
  rhachet's suites prove rhachet's own call path (which brain is chosen, what it is handed, what
  flows back)

## .taken

(b). the subject of `caseAskable` and `invokeAct` is rhachet's route — atom-first `ask`, and the
`--brain` choice — not a supplier. the suppliers prove their real contracts where they live
(`rhx git.repo.get files`, 2026-11-03):

- `ehmpathy/rhachet-brains-xai`: `genBrainAtom.integration.test.ts`,
  `genBrainAtom.credentials.integration.test.ts` (the absent-key case),
  `genBrainAtom.truncation.integration.test.ts`
- `ehmpathy/rhachet-brains-openai`: `genBrainRepl.integration.test.ts`,
  `genBrainAtom.integration.test.ts`, `contract/sdk/index.integration.test.ts`

the vision answered this fork before execution (its `.open questions`: may the xai atom and the
openai codex brain be mocked — yes). the prose-length and theme asserts graded a live model's prose,
which is the supplier's output, not rhachet's.

## .rework

clean. a real per-supplier smoketest can be added behind `describeBrainLiveOnDemand` with no change
to the mocked suites.

## .confidence

92%. the supplier suites are cited by path. the residue: whether rhachet should also keep one live
smoke per supplier it ships an adapter for.

## .where

ergo-friction-hazards lane, 5.1 i001 r009, blocker.1 and blocker.3; behavior-intent-coverage lane,
r008, nitpick.2.

## .verdict

upheld, and widened (pr #691 review, 2026-11-04, seed S1): the same holds for the real claude cli
behaviors the `clone.*.realbrain` suites pin. they move to `rhachet-brains-anthropic`, behind a
`BrainCli` interface rhachet formalizes first. two radio tasks carry it.
