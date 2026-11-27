# F28 — test infra and composed operations are proven at their callers' grain

- **fork**: add a dedicated suite for each blackbox test-infra transformer (`asHookWarnReply`, `asRoleContentDefectReceiptBlock`, `asCountOfOccurrences`) and each new boot operation; or prove them through the suites that call them
- **taken**: prove them through their callers
- **why**:
  - test infra holds no prod behavior. every branch it holds gates a blackbox assertion, so a wrong slice or a refused shape turns those suites red at once. 168 snapshots and their `toContain` reads ride on it. a unit suite of test infra tests the test
  - each new boot operation has a sole caller chain, and the integration and acceptance suites reach every branch the review lists. `getAllRepoThisRolesWithHooks` case5 and case6 read `getAllRepoThisRoleContentDefects` directly. `isCloneStopSweepArmed.integration.test.ts` clamps the arm read that `isRepoStopSweepArmed` composes. `roles.content-defects` walks every kind, owner, and arm
- **counter (5.3 i003 r4)**: `rule.require.test-coverage-by-grain` wants each operation tested at its own grain, so a defect there fails close to its source
- **answer**: the review grades both as nitpicks, and the behavior is covered today. a suite per operation would repeat the caller fixtures and reach no new branch
- **rework**: clean. add the suites; no prod code moves
- **confidence**: 80%
- **where**: 5.3 peer review i003: r4 nitpick.1, nitpick.2
- **verdict**: open
