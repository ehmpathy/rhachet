# self-review: has-zero-deferrals (r2)

## reflection

i re-read the blueprint line by line, with search for any language that suggests deferral:
- "deferred"
- "future work"
- "out of scope"
- "MVP"
- "later"
- "not included"

## search results

### filediff tree

no deferrals. all files listed as [NEW] or [EXTEND] with clear actions.

### codepath tree

no deferrals. all branches have complete logic paths.

### new files section

no deferrals. all three new files have implementation details:
- detectInvocationMethod.ts — complete
- execNpmInstallGlobal.ts — complete
- getGlobalRhachetVersion.ts — complete (added after r1 review found it was deferred)

### extended files section

no deferrals. all changes are specified.

### output format section

no deferrals. all three output cases (success both, global fails, local only) are covered.

### test coverage section

no deferrals. all files have test coverage listed.

### notes section

no deferrals. the notes are implementation guidance, not deferrals.

the previous note "version comparison deferred" was updated to "version check before global install avoids unnecessary network calls" — no longer a deferral.

## vision requirement check

| vision item | blueprint location | deferral? |
|-------------|-------------------|-----------|
| usecase 1: default upgrade (rhx) → both | detectInvocationMethod defaults to 'both' | no |
| usecase 2: explicit control (--which) | invokeUpgrade.ts --which option | no |
| usecase 3: npx → local only | detectInvocationMethod defaults to 'local' | no |
| usecase 4: already current → no network call | getGlobalRhachetVersion + skip logic | no |
| usecase 5: version mismatch → no downgrade | codepath shows upgrade-only logic | no |
| usecase 6: output clarity | output format section covers all | no |
| edge case: global fails → warn, don't block | execNpmInstallGlobal returns hint | no |

## criteria requirement check

| criteria item | blueprint location | deferral? |
|---------------|-------------------|-----------|
| --which local | test coverage: --which local case | no |
| --which global | test coverage: --which global case | no |
| --which both | test coverage: --which both case | no |
| npx + --which global → error | not explicitly listed | **POTENTIAL GAP** |

### potential gap found

criteria 2.1 usecase.2 says:
```
when(npx rhachet upgrade --which global)
  then(fails with clear error)
```

the blueprint does not explicitly show this error case. let me check the codepath tree...

the codepath tree shows:
```
if which includes 'global'
  ├── getGlobalRhachetVersion (new)
  │   ├── if null → skip global (not installed)
```

"skip global (not installed)" is not the same as "fails with clear error". this is a silent skip, not an error.

**however**, the vision usecase.3 says:
```
npx rhachet upgrade
  then(upgrades local rhachet only)
  then(no error about global)
```

the vision says "no error about global" for the default case. but criteria says "fails with clear error" when --which global is explicitly requested.

these are different cases:
1. npx + default → no error (skip silently)
2. npx + --which global → error (user asked for unavailable capability)

the blueprint handles case 1 but may not handle case 2 explicitly.

## issue found

the blueprint does not explicitly handle the case where user invokes via npx AND requests --which global. the criteria says this should "fail with clear error".

**fix needed:** add explicit error case for npx + --which global.

## fix applied

updated the blueprint to add this error case:
- added error branch in codepath tree: `if npx AND --which includes 'global' → error`
- added error output format section: "error: npx + --which global"
- added acceptance test case: `given(npx rhachet upgrade --which global) → then(stderr shows error)`
- added snapshot: "stderr format for npx + --which global error"

the blueprint now satisfies criteria usecase.2 requirement for npx + --which global → error.

## final verification: zero deferrals

after fixes, i re-scanned the blueprint for deferral language. found none.

### why each vision item holds (no deferrals)

**usecase 1: default upgrade (rhx) → both**
- blueprint: detectInvocationMethod returns 'global' when not via npm
- blueprint: default is 'both' for global invocation
- why it holds: explicit logic in codepath tree, tested in acceptance tests

**usecase 2: explicit control (--which)**
- blueprint: invokeUpgrade.ts adds --which option via commander.js
- blueprint: test coverage includes all three --which values
- why it holds: flag is first-class citizen with full test coverage

**usecase 3: npx → local only**
- blueprint: detectInvocationMethod returns 'npx' when npm_execpath set
- blueprint: default is 'local' for npx invocation
- why it holds: explicit detection logic, no silent assumptions

**usecase 4: already current → no network call**
- blueprint: getGlobalRhachetVersion checks installed version first
- blueprint: codepath shows "if null → skip" and version comparison
- why it holds: explicit pre-check before any npm install call

**usecase 5: version mismatch → no downgrade**
- blueprint: upgrade-only semantics (always @latest)
- blueprint: getGlobalRhachetVersion only checks if installed, not version comparison for downgrade
- why it holds: npm @latest semantics prevent downgrade

**usecase 6: output clarity**
- blueprint: output format section shows all four cases with exact text
- blueprint: acceptance test snapshots for visual verification
- why it holds: explicit output examples, snapshot tests catch drift

**edge case: global fails → warn, don't block**
- blueprint: execNpmInstallGlobal returns { upgraded: false, hint: '...' }
- blueprint: output shows warning with hint, continues to summary
- why it holds: structured return value (not thrown error) enables graceful continue

**edge case: npx + --which global → error**
- blueprint: codepath shows explicit error branch
- blueprint: error output format with install instructions
- why it holds: explicit error before attempting impossible operation

## conclusion

zero deferrals. every vision and criteria item has explicit blueprint coverage with articulated rationale.
