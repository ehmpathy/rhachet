# self review — 5.3.verification — has-zero-test-skips

## what I scanned (2026-11-02, after the gate-action and uid-seam edits)

- `.skip(` / `.only(` / `runIf` / `skipIf` over `src/domain.operations/clone` (`*.test.ts`),
  `src/infra/socket`, and `blackbox/cli/clone.say.slowbox.acceptance.test.ts` → `matches: 0` each
- early-return bypasses (`if (…) return`, a bare `return;`) over the infra/socket tests and the new
  acceptance file → `matches: 0`
- the shared fixtures, `genFakeSsOnPath` and `genSceneWithFakeSsOnPath`, for a silent fallback
- rescanned 2026-11-04, after the slowbox file split in two (`clone.say.slowbox.realbrain.acceptance`
  and `clone.say.slowbox.integration`): the same pattern over `blackbox/cli` with glob
  `clone.say.slowbox*.ts`, and over `src/domain.operations/clone/cli` with `*.test.ts` →
  `matches: 0` each. control: `given\(` on the slowbox glob finds 3 lines, one per case

## why each holds

- **no `ss` on the host** → `genFakeSsOnPath` throws `ConstraintError('`ss` (iproute2) is required
  for this test')` with a hint. it fails loud; it never falls back to a no-op. its one bare `return;`
  (line 91) is the PATH-restore branch for a PATH that was unset, not a test bypass
- **a nested swap or a bad delay** → `ConstraintError` too. a misuse cannot silently run a test
  under the wrong `ss`
- **`[case21]`'s host precondition** (pid 1 owned by another uid) → a `ConstraintError` with a hint,
  never a skip. a root container fails by name. the compare itself no longer depends on that host:
  `isCallerSameUser.test.ts` proves it on every host, so the precondition guards one integration
  proof, not the behavior
- **credentials** → the integration and acceptance runs unlock `ehmpath/test` through the skill
  (`keyrack: unlocked ehmpath/test`); no test reads an absent credential as a pass
- **prior failures** → none carried: every run cited in the yield ends `0 failed, 0 skipped`

## the quiet bypass I looked for hardest — a slow box that is not slow

the riskiest silent pass in `clone.say.slowbox` is not a skip but a fixture that never bites: the
fake `ss` is swapped in only while the enroll PATH is composed, then restored. (the success case now
runs against a real claude in the realbrain file; it asserts the first two guards below, and the bite
was taken on the stub file's `[case1]` before that move.) if the clone's
server never saw the fake, `[case1]` would still exit 0 — a quick-box say passes too — and the test
would prove naught about a loaded box.

it cannot pass that way, for three independent reasons:

- `[case1]` asserts `elapsedMs >= 7000`; a quick-box say returns in well under that
- `[case1]` asserts the `screen probe unanswered (a loaded box)` leaf; a quick box answers its probe,
  so that leaf never renders
- the bite: lookup set back to 5_000 → `[case1]` red, 3 failures
  (`.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-01T23-18-11Z.stderr.log`). a fake
  that never reached the server could not turn the bound into a failure

and `[case2]`'s exit-1 + `wait for the box to calm` is reachable only with every probe blind, which
again needs the slow `ss` in the clone's PATH. `afterAll(… scene?.bg?.kill())` is teardown; the `?.`
keeps a setup fault's named error from being masked by a TypeError, and it gates no assertion.

## found

none. the type-guard lines (`if (reply.probe !== 'capable') throw new Error(…)`) look like a branch
at a glance; each throws, so each fails the test, never lets it pass unread.
