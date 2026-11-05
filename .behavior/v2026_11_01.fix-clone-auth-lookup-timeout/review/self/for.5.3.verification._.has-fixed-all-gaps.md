# self review — 5.3.verification — has-fixed-all-gaps

I walked the seven reviews above, one gap at a time. Each line names the review that found the gap, the gap itself, and the file where it was fixed. No line in any review reads "todo" or "later", and none marks coverage incomplete.

## per review

### 1/8 — has-behavior-coverage
- **gap: the checklist did not name two vision edgecases.** These are "lookup throws fast → deny" and "lookup never settles → `auth-gate-timeout`".
  - fix: `5.3.verification.yield.md` now has two edge rows. They cite `awaitCloneAuthGate.test.ts` (throw → `deny`; never settled → `timeout`), `isCallerSameUser.test.ts` (a fault propagates) and `computeCloneAuthGateAction.test.ts` (timeout → NACK).
- **gap: the vision still read F7 as open in two places.**
  - fix: in `1.vision.yield.md`, the cons line and the 60s-kill edgecase now state the settled fact and cite `getSocketPeerCred [case2]`.
- **gap: the MAXBUFFER fault branch had no clamp.** This review first recorded it as held. Re-read at this closer, it was a detected gap left unfixed, so it was fixed:
  - `src/.test/assets/genFakeSsOnPath.ts` gains a `flooded` view: the real table, then 70 MiB of `FAKE_SS_FLOOD_ROW` lines through `yes | head -c`. `asFakeSsBody` takes `floodBytes`.
  - `src/infra/socket/getSocketPeerCred.integration.test.ts [case6]` asserts the `` `ss` table exceeds the read buffer `` message and `errnoCode: ERR_CHILD_PROCESS_STDIO_MAXBUFFER`.
  - bite: with the branch removed from `asSsScanFaultMessage`, the test went red and received "`ss` scan failed" (`.log/role=mechanic/skill=git.repo.test/what=integration/2026-11-02T00-30-20Z.stderr.log`).
  - restored: green, `tests: 143 passed` (`…/what=integration/2026-11-04T10-58-01Z.stdout.log`).
  - slowbox acceptance, which shares the fixture, is green on it: `tests: 9 passed` (`…/what=acceptance/2026-11-04T11-02-37Z.stdout.log`).
  - the records that called it held now say it is clamped: i007 `r011._.taken.by_self.enroll-impl-arch-defects.md` nitpick.3, `5.1.execution.from_vision.yield.md` (the `ss` faults line), the 1/8 review's vision bullet, and a new `5.3.verification.yield.md` checklist row.
  - why it was owed: the branch is the only reason `SS_TABLE_MAX_BYTES` has a name in the error. Unclamped, a later edit could fold it back into "`ss` scan failed", and a human would then wait longer when the cure is a larger buffer.

### 2/8 — has-zero-test-skips
- no gap. The scan found `matches: 0` for `.skip`, `.only`, `runIf` and `skipIf`. The quiet bypass, a fake `ss` that never reaches the clone, is ruled out by three separate checks: `elapsedMs >= 7000`, the `screen probe unanswered` leaf, and the 5_000 bite that went red.
- the new `[case6]` adds no skip. On a host with no `ss`, its scene throws a named ConstraintError, and `afterAll` uses `?.` so a TypeError cannot replace that error.

### 3/8 — has-all-tests-passed
- **gap: lint was red, and my first draft cited an older green run.** The defect was biome `organizeImports` in `isCallerSameUser.test.ts`.
  - fix: `npm run fix:format:biome`, then lint, format, types and the `clone/socket` unit scope were rerun green. The logs are in that review.
- **gap: the edits in this closer came after every cited run.**
  - fix: after the case6 edits I reran socket integration (143), types (28s), lint (47s), format (5s) and slowbox acceptance (9). All are pasted into the 3/8 review and the `5.3.verification.yield.md` proof table.

### 4/8 — has-preserved-test-intentions
- no gap. Each changed assertion maps to a raised and recorded requirement (r11 blocker.1, r10 blocker.1). `[case6]` is add-only: no prior assertion moved.

### 5/8 — has-snap-changes-rationalized
- no gap. Three snap files, each entry with a rationale and no bulk resnap. `[case6]` asserts its message and adds no snapshot, since the copy is a server log reason, not a human-faced render. So no `.snap` moved in this closer.

### 6/8 — has-critical-paths-frictionless
- **gap: F12 was stale.** It still claimed "no cli render" and "no cli acceptance case".
  - fix: the F12 entry and summary row in `.fulcrums/` now carry a verdict section. It says the acceptance half was reversed in i007, and it holds the wait signal with its 13.7s measurement for #688.
- **gap: the pasted copy and elapsed time were stale** after the 7/8 reword.
  - fix: that review now pastes the new header and the 29958ms run.

### 7/8 — has-ergonomics-validated
- **gap: the path-2 header did not scan like its peers.** It used two em-dash asides around a parenthetical.
  - fix: `computeCloneSayReport.ts` now reads `… in time (a loaded box: its auth check is slow) and the transcript did not rise within the bound`.
  - one entry moved in each of `computeCloneSayReport.test.ts.snap` and `clone.say.slowbox.acceptance.test.ts.snap`. Each passed an independent run without a resnap: unit 19 (`…/what=unit/2026-11-02T00-25-57Z`) and acceptance 9 (`…/what=acceptance/2026-11-02T00-24-12Z`).

## the one item left open — named, and not a gap of this PR

- **the silent wait on a loaded box** (6/8 and 7/8 score it ✗). This is not a coverage, prod, test or skip gap in this deliverable: the wait predates this PR and holds at every clone-say output.
  - a fix is an output contract across the clone-say suites. That is not CLEAN in this diff (`rule.always.fix-forward-under-scouts-honor`).
  - it is held by fulcrum F12 with its measured cost, and owned by ehmpathy/rhachet#688.
  - the deferrals the wisher settled (#682 the 30s client window, #684 the scan abort, #683 the lookup-fault reason, #686 the keyrack peer pid) are scope cuts with their own issues, not gaps this stone surfaced.

## lesson

"held" earns a place only when the fix fails SAFE or CLEAN. The MAXBUFFER clamp was safe (one view, one given) and clean (no ripple). Its first excuse was the cost of a 70 MiB stream, yet the whole socket suite, case6 included, ran in 26s. When a reason to hold names a cost, measure that cost before you rely on it.
