# review: behavior-declaration-adherance

## adherence check: implementation vs spec

reviewed each changed file line by line against vision, criteria, and blueprint to verify the implementation adheres to the spec.

## changed files reviewed

### detectInvocationMethod.ts

**vision states:** "detects npx invocation" and "if npx → default to 'local'"

**blueprint states:** check `npm_execpath` env var — set when via npm/npx

**implementation:**
```typescript
export const detectInvocationMethod = (): 'npx' | 'global' => {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) return 'npx';
  return 'global';
};
```

**adherence:** holds because the implementation matches the blueprint exactly — checks npm_execpath and returns 'npx' or 'global' as specified.

### getGlobalRhachetVersion.ts

**vision states:** "detects if rhachet is installed globally"

**blueprint states:** use `npm list -g rhachet --depth=0 --json` to get installed version, handle both npm and pnpm json formats

**implementation:**
```typescript
const result = spawnSync('npm', ['list', '-g', 'rhachet', '--depth=0', '--json'], {
  stdio: 'pipe',
  shell: true,
});
// parses both npm format: { dependencies: { rhachet: { version } } }
// and pnpm format: [{ name, version }]
```

**adherence:** holds because the implementation uses the exact command from the blueprint and handles both json formats as specified.

### execNpmInstallGlobal.ts

**vision states:** "upgrades global install"

**blueprint states:** invoke `npm install -g rhachet@latest`, fail fast on EACCES/EPERM

**implementation:**
```typescript
const result = spawnSync('npm', ['install', '-g', ...packagesLatest], {
  stdio: 'pipe',
  shell: true,
});
if (result.status !== 0) {
  throw new Error(`global install failed: ${stderr}`);
}
```

**adherence:** holds because the implementation uses npm install -g as specified and throws on error (fail fast).

### execUpgrade.ts changes

**vision states:**
- default behavior based on invocation method
- explicit control via --which flag
- global failure should not block local

**criteria states:**
- given(rhx upgrade) then upgrades local AND global
- given(rhx upgrade --which local) then upgrades local only
- given(npx rhachet upgrade) then upgrades local only
- given(global fails) then warns and continues, local not blocked

**blueprint states:**
- add `which?: 'local' | 'global' | 'both'` to input
- detect invocation method if --which not specified
- wrap global upgrade in try/catch for warn-and-continue

**implementation:**
```typescript
// which determination
const whichTargets: WhichTarget[] = (() => {
  if (input.which === 'local') return ['local'];
  if (input.which === 'global') return ['global'];
  if (input.which === 'both') return ['local', 'global'];
  const method = detectInvocationMethod();
  if (method === 'npx') return ['local'];
  return ['local', 'global'];
})();

// global upgrade with try/catch
if (whichTargets.includes('global')) {
  const globalVersion = getGlobalRhachetVersion();
  if (globalVersion !== null) {
    try {
      upgradedGlobal = execNpmInstallGlobal({ packages: ['rhachet'] });
    } catch (error) {
      // warn and continue
      console.log('❌ rhachet upgrade globally failed');
      upgradedGlobal = { upgraded: false, error: message };
    }
  }
}
```

**adherence:** holds because:
- explicit --which flags map to correct targets
- npx detection defaults to local only
- rhx detection defaults to local + global
- try/catch ensures global failure doesn't block local (per criteria usecase 3)

### invokeUpgrade.ts changes

**blueprint states:** add `--which` option accepting 'local', 'global', or 'both'

**implementation:**
```typescript
.option(
  '--which <which>',
  'which installs to upgrade: local, global, or both',
)
```

**adherence:** holds because the CLI option matches the blueprint spec exactly.

### UpgradeResult interface

**blueprint states:** add `upgradedGlobal: { upgraded: boolean } | null` to result

**implementation:**
```typescript
export interface UpgradeResult {
  upgradedSelf: boolean;
  upgradedRoles: RoleSupplierSlug[];
  upgradedBrains: BrainSupplierSlug[];
  upgradedGlobal: { upgraded: boolean; error?: string } | null;
}
```

**adherence:** holds because the interface matches the blueprint. the optional `error` field was added to support the warn-and-continue pattern per criteria usecase 3.

## deviations found and addressed

### deviation 1: error field added to UpgradeResult

the blueprint specified `{ upgraded: boolean }` but implementation has `{ upgraded: boolean; error?: string }`.

**why this is correct:** the criteria (usecase 3) specifies "surfaces hint for manual upgrade" on failure. the error field enables the output handler to show the error message and hint. this is an enhancement to support the criteria, not a deviation from it.

## test verification

ran all unit tests for the new and modified files:

```
npm run test:unit -- src/domain.operations/upgrade/detectInvocationMethod.test.ts \
  src/domain.operations/upgrade/getGlobalRhachetVersion.test.ts \
  src/domain.operations/upgrade/execNpmInstallGlobal.test.ts \
  src/domain.operations/upgrade/execUpgrade.test.ts
```

**result:** 51 passed, 0 failed

### test coverage by criteria usecase

| criteria usecase | test case | status |
|------------------|-----------|--------|
| usecase 1: default upgrade | "defaults to both local and global" | pass |
| usecase 2: npx invocation | "invoked via npx → defaults to local only" | pass |
| usecase 3: global fails | "warns and continues — local not blocked" | pass |
| --which local | "upgrades local only, skips global" | pass |
| --which global | "upgrades global only, skips local" | pass |
| --which both | "upgrades both local and global" | pass |
| global not installed | "skips global upgrade silently" | pass |
| EACCES error | "throws error" (in execNpmInstallGlobal) | pass |
| EPERM error | "throws error" (in execNpmInstallGlobal) | pass |
| npm format | "returns version string" | pass |
| pnpm format | "returns version string" | pass |

### specific test verifications

**usecase 3 (global failure):**
the test "warns and continues — local not blocked by global failure" verifies:
- mockExecNpmInstallGlobal throws EACCES error
- result.upgradedSelf is true (local succeeded)
- result.upgradedGlobal equals { upgraded: false, error: '...' }
- console output shows "❌ rhachet upgrade globally failed" and "permission denied"

this confirms the criteria requirement: "exits with success sothat local upgrade is not blocked by global failure"

## line-by-line verification against spec

### detectInvocationMethod.ts (13 lines)

- line 7: return type matches blueprint ('npx' | 'global')
- line 9: reads npm_execpath as blueprint specifies
- line 10: returns 'npx' when set, matches blueprint
- line 11: returns 'global' otherwise, matches blueprint

### getGlobalRhachetVersion.ts (41 lines)

- line 12: command matches blueprint exactly: ['list', '-g', 'rhachet', '--depth=0', '--json']
- line 19: returns null on failure as blueprint specifies
- lines 24-27: handles npm json format as blueprint specifies
- lines 30-34: handles pnpm json format as blueprint specifies
- line 38-39: returns null on parse error (defensive)

### execNpmInstallGlobal.ts (26 lines)

- line 13: maps packages to @latest as blueprint specifies
- line 15: command is npm install -g as blueprint specifies
- lines 20-22: throws on error (fail fast) as blueprint specifies

### execUpgrade.ts changes

- lines 83-91: whichTargets determination matches blueprint exactly
- line 88: calls detectInvocationMethod as blueprint specifies
- line 89: returns ['local'] for npx as blueprint specifies
- line 90: returns ['local', 'global'] for global as blueprint specifies
- lines 160-171: try/catch for global failure as criteria usecase 3 requires
- line 169: returns { upgraded: false, error } instead of throw

### invokeUpgrade.ts changes

- lines 25-28: --which option matches blueprint exactly
- line 62-64: outputs global upgrade status when upgraded

## verdict

all implementations adhere to vision, criteria, and blueprint. 51 tests pass. one enhancement (error field) supports criteria requirement to surface hints on failure. line-by-line verification confirms no deviations from spec.
