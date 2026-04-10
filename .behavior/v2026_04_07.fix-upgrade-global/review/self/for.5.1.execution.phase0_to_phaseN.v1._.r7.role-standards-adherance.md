# review: role-standards-adherance

## mechanic briefs directories checked

enumerated rule categories relevant to this code:

| category | relevance |
|----------|-----------|
| lang.terms/ | variable names, function names |
| lang.tones/ | comments, log messages |
| code.prod/evolvable.procedures/ | function signatures, input-context pattern |
| code.prod/evolvable.domain.operations/ | operation name patterns (get/set/gen) |
| code.prod/pitofsuccess.errors/ | error handle patterns, fail-fast |
| code.prod/readable.comments/ | .what/.why headers |
| code.prod/readable.narrative/ | code flow, early returns |
| code.test/ | test patterns, given/when/then |

## file-by-file standards check

### detectInvocationMethod.ts

**rule.require.what-why-headers:** holds because lines 1-5 have `.what` and `.why` jsdoc comments

**rule.require.arrow-only:** holds because line 7 uses arrow function `export const detectInvocationMethod = (): ... => {`

**rule.forbid.gerunds:** holds because no gerunds in names or comments

**rule.require.get-set-gen-verbs:** n/a — this is a `detect*` transformer, not a get/set/gen operation. `detect*` is an established pattern:

verified via grep in same directory:
```
src/domain.operations/upgrade/detectPackageManager.ts
src/domain.operations/init/detectBrainReplsInRepo.ts
```

`detect*` functions are transformers that compute state from environment, distinct from get/set/gen operations that interact with persistence or external services.

### getGlobalRhachetVersion.ts

**rule.require.what-why-headers:** holds because lines 3-7 have `.what`, `.why`, and `.note` jsdoc comments

**rule.require.arrow-only:** holds because line 9 uses arrow function

**rule.require.get-set-gen-verbs:** holds because function name starts with `get` (getGlobalRhachetVersion)

**rule.forbid.gerunds:** holds because no gerunds in names or comments

**rule.require.failfast:** n/a — this function returns null on failure, which is valid for a getter that checks if an item is installed

### execNpmInstallGlobal.ts

**rule.require.what-why-headers:** holds because lines 3-8 have `.what`, `.why`, and `.note` jsdoc comments:
```typescript
/**
 * .what = executes npm install -g for specified packages
 * .why = enables global rhachet upgrade
 * .note = invokes npm which may be aliased to pnpm on some machines
 */
```

**rule.require.arrow-only:** holds because line 10 uses arrow function:
```typescript
export const execNpmInstallGlobal = (
  input: { packages: string[] },
): { upgraded: boolean } => {
```

**rule.require.input-context-pattern:** partially holds — function has `input` parameter but no `context` because it's a leaf communicator that invokes external command (npm) without need for injected dependencies.

**rule.forbid.gerunds:** holds because no gerunds in names or comments

**rule.require.failfast:** holds because lines 20-22 throw error on non-zero exit status:
```typescript
if (result.status !== 0) {
  throw new Error(`global install failed: ${stderr}`);
}
```

### execUpgrade.ts changes

**rule.require.what-why-headers:** holds because UpgradeResult interface has jsdoc at lines 19-22:
```typescript
/**
 * .what = result of upgrade operation
 * .why = provides structured summary of what was upgraded
 */
export interface UpgradeResult {
```

**rule.require.input-context-pattern:** holds because function signature is `(input: {...}, context: ContextCli)`:
```typescript
export const execUpgrade = async (
  input: {
    self?: boolean;
    roleSpecs?: string[];
    brainSpecs?: string[];
    which?: 'local' | 'global' | 'both';
  },
  context: ContextCli,
): Promise<UpgradeResult> => {
```

**rule.forbid.else-branches:** holds because no else branches added — uses IIFE with early returns for whichTargets:
```typescript
const whichTargets: WhichTarget[] = (() => {
  if (input.which === 'local') return ['local'];
  if (input.which === 'global') return ['global'];
  if (input.which === 'both') return ['local', 'global'];
  const method = detectInvocationMethod();
  if (method === 'npx') return ['local'];
  return ['local', 'global'];
})();
```

**rule.require.narrative-flow:** holds because code flows linearly:
1. determine whichTargets (lines 83-91)
2. determine what to upgrade (lines 93-102)
3. expand role specs (lines 104-108)
4. expand brain specs to packages (lines 110-114)
5. detect local refs to exclude (lines 116-128)
6. build install list (lines 130-136)
7. execute local npm install (lines 138-141)
8. re-init linked roles (lines 143-152)
9. global upgrade (lines 154-173)
10. return result (lines 175-191)

**rule.require.failfast (exception):** the try/catch at lines 160-171 is intentional per criteria usecase 3. the catch block does not hide the error — it logs and returns error details:
```typescript
try {
  upgradedGlobal = execNpmInstallGlobal({ packages: ['rhachet'] });
} catch (error) {
  // warn and continue — local upgrade should not be blocked by global failure
  const message = error instanceof Error ? error.message : String(error);
  console.log('');
  console.log('❌ rhachet upgrade globally failed');
  console.log(`   └── ${message.includes('EACCES') || message.includes('EPERM') ? 'permission denied' : message}`);
  console.log('');
  upgradedGlobal = { upgraded: false, error: message };
}
```

### invokeUpgrade.ts changes

**rule.require.what-why-headers:** holds because file has jsdoc at lines 6-8

**rule.forbid.gerunds:** holds because no gerunds in option names or descriptions

### test files

**rule.require.given-when-then:** holds because all test files use given/when/then structure from test-fns:

detectInvocationMethod.test.ts:
```typescript
given('[case1] npm_execpath is set', () => {
  when('[t0] detectInvocationMethod is called', () => {
    then('returns npx', () => {
```

getGlobalRhachetVersion.test.ts:
```typescript
given('[case1] rhachet is installed globally', () => {
  when('[t0] getGlobalRhachetVersion is called', () => {
    then('returns the version string', () => {
```

execNpmInstallGlobal.test.ts:
```typescript
given('[case1] npm install -g succeeds', () => {
  when('[t0] execNpmInstallGlobal is called', () => {
    then('returns { upgraded: true }', () => {
```

execUpgrade.test.ts:
```typescript
given('[case1] user specifies --which local', () => {
  when('[t0] execUpgrade is called', () => {
    then('upgrades local only', async () => {
```

**rule.forbid.redundant-expensive-operations:** holds because tests use useBeforeAll for shared expensive setup, not repeated in each then block:
```typescript
const scene = useBeforeAll(async () => ({
  result: await execUpgrade({ which: 'local' }, mockContext),
}));

then('upgradedSelf is true', () => {
  expect(scene.result.upgradedSelf).toEqual(true);
});

then('upgradedGlobal is null', () => {
  expect(scene.result.upgradedGlobal).toEqual(null);
});
```

## issues found and fixed

none. all code adheres to mechanic standards.

## edge case: try/catch in execUpgrade.ts

the try/catch at lines 160-171 appears to violate rule.forbid.failhide but is intentional:

- criteria usecase 3 explicitly requires: "exits with success sothat local upgrade is not blocked by global failure"
- the catch block does NOT hide the error — it logs a warn and returns { upgraded: false, error: message }
- this is "fail loud, continue gracefully" not "fail hide"

**verdict:** not a violation because error is surfaced (logged and returned), not hidden.

## verdict

all code adheres to mechanic role standards. one apparent exception (try/catch) is intentional per criteria and does not hide errors.
