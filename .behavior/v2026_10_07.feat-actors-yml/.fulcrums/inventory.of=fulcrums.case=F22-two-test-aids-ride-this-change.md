# F22 — two test aids ride this change: the samecwd spawn floor and `test.acceptance.credfree`

- **fork** — enroll-impl-arch-defects (i004) reads both as scope leaks. (a) eject both to their
  own PRs · (b) keep both, since this route asked for each
- **taken** — (b).
  - the `Math.max(Date.now(), birthtimeMs)` floor in `clone.samecwd-race.acceptance.test.ts` is a
    repair a peer asked for on this stone (arch-hazards-behavior nitpick.3, i001; the `.taken` quotes
    it). to eject it now would undo an answer the route already gave
  - `test.acceptance.credfree` is how this route measured the absent-manifest promise ("an absent
    `actors.yml` keeps today's behavior") over every cred-free `init.*` / `enroll.*` suite, 800
    tests, cited in `review/self/for.5.1.execution.from_vision._.has-pruned-backcompat.md`. it is
    the scoped run `rule.forbid.local-full-test-sweeps` asks for, and it was reviewed in scope
    (repo-rules blocker, i001, answered with a help clamp)
  - the deferred keyrack teardown race is a different case: no reviewer asked for it, and no
    measurement of this route rests on it
- **rework** — clean — revert one test line, move one skill and its test
- **confidence** — 75%
- **where** — raised by enroll-impl-arch-defects nitpick.5, .6 (i004)
- **verdict** — unruled; best guess taken
