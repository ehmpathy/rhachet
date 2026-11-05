# F7 — claims the files on disk refute (a dispute)

## .the fork
some concerns state a fact about the code that the files do not hold. so:
- A: change the code to answer the claim
- B: cite the file that already holds the behavior

## .taken
B, per claim, each by a path:
- "no clamp test for the 0444 outside file" — `blackbox/cli/init.hooks.outside-repo.acceptance.test.ts`
  case1 builds that scene: a temp repo, an actor whose arrow reaches a 0444 home file; asserts
  exit 0, the bytes identical, the note printed once. its red half against v1.49.1 is owed to 5.3
  (F2)
- "the read-only note prints once per actor" — `asReadonlyOutsideSettingsNoteLines.ts` keeps the
  first target per realpath; `asReadonlyOutsideSettingsNoteLines.test.ts` case2 holds two actors
  that reach one file, one block
- "the skip and note lack snapshots" — `blackbox/cli/__snapshots__/init.hooks.outside-repo.acceptance.test.ts.snap`
  snaps case1 (note) and case4 (skip warn + skip row); `__snapshots__/asReadonlyOutsideSettingsNoteLines.test.ts.snap`
  and the case7 row snapshot cover the units
- "`writeClaudeCodeSettings` never writes; references `input.settingsDir`" — the guard is its own
  function, `assertSettingsDirWithin({ settingsDir, to })`, called before the mkdir; the temp
  write and rename follow it. `config.dao.writeOutside.integration.test.ts` case3 proves a write
  inside lands
- "the test file is spliced" — `asEnrolledActorsHookSyncLines.test.ts` on disk parses; the types
  tier and the unit tier both pass over it
- "the guard is absent at `setBrainDirBoot` / `writeClaudeCodeSettings`" — both call it as their
  first act: `assertBrainDirInsideRepo(input)` and `assertSettingsDirWithin(...)`
- "the pre-init and boot-render phases may push the guard's throw into `errors`" —
  `setRepoActorBrainDirLayoutBeforeInits` returns null on any fault that is not a code defect; the
  boot sync re-runs the step, and `asBrainDirSyncFailuresSplit` lifts a `BrainDirOutsideRepoError`
  cause out as a skip, which sets no exit code
- "the every-error-has-a-row clamp is absent" — `asActorSettlementsSplit.test.ts` case1; the lane's
  `--paths-wout '**/*.test.ts'` bind leaves it out of that lane's target
- "case10's assertions sit in the shield test, with an absent import, an untyped error, a nested
  `then`" — they sit only in `setBrainDirSettingsLayout.integration.test.ts` (lines 543 and 549),
  which imports `lstatSync`, narrows the error with `instanceof ConstraintError`, and declares
  three peer `then` blocks. 38/38 pass
- "case7's skip snapshot is not committed" — the snap file's line 36 holds the case7 export; the
  suite passes without `--resnap`
- "the narrow guard rethrows `null` when no error is thrown" — `getError` returns
  `Error | NoErrorThrownError`, per the types tier, so a non-throw rethrows a named Error

raised at 5.3:
- "`syncAndReportBrainDirBoots.ts` holds test code after its imports, and cannot compile" — the
  file on disk holds its imports, then `REPO_BRAIN_DIR_READER` and its own procedures; no `expect`,
  `given` or `jest` appears in it. the types tier passes over it, and `invokeInit` imports it
- "`asBrainDirMasked` is dead: no snapshot uses it" — the layout suite calls it in case10 and
  case11, each inside a `toMatchSnapshot`
- "the init skip block, the skipped row, the read-only note and the zero-actor section are only
  matched by `toContain`" — each is snapped through the built binary in
  `blackbox/cli/__snapshots__/init.hooks.outside-repo.acceptance.test.ts.snap`: the skip block and
  the skipped row in case4, case6, case7, case13; the read-only note in case1, case5, case10;
  the zero-actor section in case5. the `toContain` in the integration case8 is a second, narrower
  proof beside them, not the only one
- "enroll's refusals ship with no acceptance journey" — `enroll.outside-repo.acceptance.test.ts`
  case1 and case2 hold the actors-root refusal with its stderr snapped. the second refusal (the
  actor's own brain dir) had none; that half was a real gap, fixed at 5.3 as case3
- "the new settings-read dao branches have no visible integration coverage" —
  `config.dao.integration.test.ts` holds each branch on a real fs: case1 (neither file → `{}`),
  case2 (the legacy real `settings.json` read as repo settings), case3 (with both present,
  `settings.of.repo.json` wins), case4 (a `settings.json`
  arrow to the grove is never read), case5 (a dir at `settings.of.repo.json` surfaces `EISDIR`,
  never read as absent), case6 (invalid json → a `ConstraintError` that names the file and the fix)

## .rework
clean — none needs a change.

## .confidence
97%. each is a path a reader can open.

## .where
the paths above.
