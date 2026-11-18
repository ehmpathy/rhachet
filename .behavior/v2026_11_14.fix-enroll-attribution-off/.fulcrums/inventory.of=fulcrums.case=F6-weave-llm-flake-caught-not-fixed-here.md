# F6: the weave llm flake — fix here, or catch it

- **the fork**: `enweaveOneRoute.integration.test.ts` › *"it should successfully execute the stitches
  as a weave"* failed once in a full impacted integration run (`2030 passed, 1 failed`): the llm
  replied in prose, not conflict markers. fix it in this PR, or catch it as a dream
- **taken, first**: catch it as a dream, as a weave change outside the attribution path
- **overturned**: by peer review 5.3 r1 blocker.2 (`rule.forbid.deferrals-short-of-a-dedicated-pr`):
  a test flake does not clear the massive-refactor bar, so it is done now
- **the cause, once read**: not the llm. the test's read stub returned its code as a bare string,
  while `stitcherCodeDiffImagine` reads `stitch.output.content`; the prompt carried `undefined` where
  the code belonged, and the llm asked for it. the peer suite `enweaveOneStitcher` passes
  `{ content }`, which is why it never flaked
- **the fix**: the stub returns `{ content }`; a new assert pins that the prompt carries the code
  (`sdkOpenMeteo`) — red on the old shape
  (`.log/role=mechanic/skill=git.repo.test/what=integration/2026-11-14T16-44-03Z.stderr.log`), green
  on the fix (`…/2026-11-14T16-43-25Z`, `…/2026-11-14T16-44-47Z`, and all three weave suites
  `…/2026-11-14T16-45-07Z`, `10 passed`)
- **rework**: clean — two lines in one test file
- **confidence**: 95%
- **where**: `src/domain.operations/weave/enweaveOneRoute.integration.test.ts`
- **verdict**: fixed in this PR; the dream is removed
