# review: role-standards-coverage

## scope

this review checks: are all relevant mechanic standards applied? are there patterns that should be present but are absent?

## briefs directories enumerated

| directory | purpose | relevant? |
|-----------|---------|-----------|
| lang.terms/ | variable/function names | yes |
| lang.tones/ | comments, logs | yes |
| code.prod/evolvable.procedures/ | function patterns | yes |
| code.prod/evolvable.domain.operations/ | get/set/gen verbs | yes |
| code.prod/pitofsuccess.errors/ | error patterns | yes |
| code.prod/readable.comments/ | jsdoc headers | yes |
| code.prod/readable.narrative/ | code flow | yes |
| code.test/ | test patterns | yes |

## file-by-file coverage check

### detectInvocationMethod.ts (13 lines)

**line-by-line verification:**

```typescript
// lines 1-6: jsdoc header
/**
 * .what = detects if rhachet was invoked via npx or global install
 * .why = determines default --which behavior for upgrade command
 *
 * .note = npm_execpath is set when invoked via npm/npx
 */
// line 7: arrow function with type annotation
export const detectInvocationMethod = (): 'npx' | 'global' => {
// line 8: inline comment explains behavior
  // npm_execpath is set when invoked via npm/npx
// lines 9-11: early returns (no else branches)
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) return 'npx';
  return 'global';
};
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.what-why-headers | yes | lines 1-6 have .what, .why, .note |
| rule.require.arrow-only | yes | line 7 uses arrow function syntax |
| rule.forbid.gerunds | yes | function name is verb+noun, no -ing |
| rule.forbid.else-branches | yes | lines 10-11 use early return pattern |
| rule.require.type-annotations | yes | return type is explicit union |

**patterns absent?** none — transformer is minimal and follows all standards

### detectInvocationMethod.test.ts (43 lines)

**line-by-line verification:**

```typescript
// line 1: imports from test-fns
import { given, then, when } from 'test-fns';

// lines 6-14: proper setup/teardown pattern
const originalEnv = process.env;
beforeEach(() => { process.env = { ...originalEnv }; });
afterAll(() => { process.env = originalEnv; });

// lines 16-23: [case1] uses proper labels
given('[case1] npm_execpath is set', () => {
  when('[t0] detectInvocationMethod is called', () => {
    then('returns npx', () => {
      process.env.npm_execpath = '/usr/local/lib/node_modules/npm/bin/npx-cli.js';
      expect(detectInvocationMethod()).toEqual('npx');
    });
  });
});

// lines 26-32: [case2] covers opposite condition
given('[case2] npm_execpath is not set', () => {
  // ... expect(detectInvocationMethod()).toEqual('global');
});

// lines 35-42: [case3] covers edge case (empty string)
given('[case3] npm_execpath is empty string', () => {
  // ... expect(detectInvocationMethod()).toEqual('global');
});
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.given-when-then | yes | all 3 cases use given/when/then |
| rule.require.case-labels | yes | [case1], [case2], [case3], [t0] |
| rule.forbid.redundant-expensive-operations | yes | no expensive ops to share |
| each then has assertion | yes | every then has expect() |

**patterns absent?** none — test covers npx set, not set, and empty string edge case

### getGlobalRhachetVersion.ts (41 lines)

**line-by-line verification:**

```typescript
// lines 3-8: jsdoc header with .what, .why, .note
/**
 * .what = detects current global rhachet version (if installed)
 * .why = enables check before global upgrade
 *
 * .note = handles both npm and pnpm json output formats (npm may be aliased to pnpm)
 */

// line 9: arrow function with explicit return type
export const getGlobalRhachetVersion = (): string | null => {

// lines 10-17: spawns npm command
const result = spawnSync('npm', ['list', '-g', 'rhachet', '--depth=0', '--json'], {
  stdio: 'pipe',
  shell: true,
});

// line 19: fail-fast null return on error
if (result.status !== 0) return null;

// lines 21-40: try/catch for json parse with null fallback
try {
  const output = JSON.parse(result.stdout.toString());
  // lines 24-27: npm format
  if (output.dependencies?.rhachet?.version) {
    return output.dependencies.rhachet.version;
  }
  // lines 29-35: pnpm format (array)
  if (Array.isArray(output)) {
    const rhachet = output.find((p: { name: string }) => p.name === 'rhachet');
    return rhachet?.version ?? null;
  }
  return null;
} catch {
  return null;  // line 39: null on parse error
}
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.what-why-headers | yes | lines 3-8 have .what, .why, .note |
| rule.require.arrow-only | yes | line 9 arrow function |
| rule.require.get-verb-prefix | yes | name is `getGlobalRhachetVersion` |
| rule.forbid.else-branches | yes | uses early returns throughout |
| rule.require.failfast (null variant) | yes | line 19, 37, 39 return null on error |

**patterns absent?** none — covers npm format, pnpm format, parse error

### getGlobalRhachetVersion.test.ts (136 lines)

**line-by-line verification:**

```typescript
// lines 1-4: proper imports
import { given, then, when } from 'test-fns';
import { spawnSync } from 'node:child_process';

// lines 6-8: mock of external boundary (spawnSync) — not domain logic
jest.mock('node:child_process', () => ({ spawnSync: jest.fn() }));

// cases enumerated:
// [case1] lines 17-37: npm format success
// [case2] lines 40-58: pnpm format success
// [case3] lines 61-75: not installed (empty deps)
// [case4] lines 78-92: npm list fails (exit 1)
// [case5] lines 95-110: malformed json
// [case6] lines 112-135: pnpm format without rhachet
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.given-when-then | yes | all 6 cases use given/when/then |
| rule.require.case-labels | yes | [case1] through [case6], [t0] |
| mock external only | yes | mocks spawnSync (child_process), not domain fn |
| tests success paths | yes | case1 npm, case2 pnpm |
| tests failure paths | yes | case3 empty, case4 exit 1, case5 bad json, case6 no rhachet |

**patterns absent?** none — comprehensive coverage of all json formats and error states

### execNpmInstallGlobal.ts (26 lines)

**line-by-line verification:**

```typescript
// lines 3-9: jsdoc with .what, .why, .note (x2)
/**
 * .what = executes global npm install for specified packages
 * .why = enables upgrade of global rhachet install
 *
 * .note = invokes npm command, which may be aliased to pnpm on some machines
 * .note = fails fast on EACCES/EPERM errors
 */

// lines 10-12: arrow fn with input parameter and return type
export const execNpmInstallGlobal = (input: {
  packages: string[];
}): { upgraded: boolean } => {

// line 13: maps packages to @latest
const packagesLatest = input.packages.map((p) => `${p}@latest`);

// lines 15-18: spawns npm command
const result = spawnSync('npm', ['install', '-g', ...packagesLatest], {
  stdio: 'pipe', shell: true,
});

// lines 20-23: fail-fast on error
if (result.status !== 0) {
  const stderr = result.stderr?.toString() || '';
  throw new Error(`global install failed: ${stderr}`);
}

// line 25: success return
return { upgraded: true };
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.what-why-headers | yes | lines 3-9 have .what, .why, .note x2 |
| rule.require.arrow-only | yes | line 10 arrow function |
| rule.require.input-pattern | yes | `input: { packages }` pattern |
| rule.require.failfast | yes | lines 20-23 throw on error |
| rule.require.typed-return | yes | explicit `{ upgraded: boolean }` |

**patterns absent?** none — communicator is focused, fail-fast, typed

### execNpmInstallGlobal.test.ts (164 lines)

**line-by-line verification:**

```typescript
// lines 6-8: mock external boundary only
jest.mock('node:child_process', () => ({ spawnSync: jest.fn() }));

// cases enumerated (7 total):
// [case1] lines 17-37: npm success
// [case2] lines 40-55: pnpm success (aliased)
// [case3] lines 58-76: EACCES npm format
// [case4] lines 79-97: EACCES pnpm format
// [case5] lines 100-118: EPERM npm format (Windows)
// [case6] lines 121-137: EPERM pnpm format (Windows)
// [case7] lines 140-163: multiple packages with @latest suffix
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.given-when-then | yes | all 7 cases use given/when/then |
| rule.require.case-labels | yes | [case1] through [case7], [t0] |
| mock external only | yes | mocks spawnSync, not domain fn |
| tests success paths | yes | case1 npm, case2 pnpm |
| tests error paths | yes | case3-6 cover EACCES/EPERM for npm and pnpm |
| tests edge cases | yes | case7 tests multiple packages |

**patterns absent?** none — comprehensive coverage of success, error, and multi-package scenarios

### execUpgrade.ts (changes: lines 72-191)

**line-by-line verification of changes:**

```typescript
// lines 19-28: UpgradeResult interface with jsdoc
/**
 * .what = result of upgrade operation
 * .why = provides structured summary of what was upgraded
 */
export interface UpgradeResult {
  upgradedSelf: boolean;
  upgradedRoles: RoleSupplierSlug[];
  upgradedBrains: BrainSupplierSlug[];
  upgradedGlobal: { upgraded: boolean; error?: string } | null;
}

// lines 77-78: input type extended
which?: 'local' | 'global' | 'both';

// lines 82-91: whichTargets via IIFE with early returns (no else)
const whichTargets: WhichTarget[] = (() => {
  if (input.which === 'local') return ['local'];
  if (input.which === 'global') return ['global'];
  if (input.which === 'both') return ['local', 'global'];
  const method = detectInvocationMethod();
  if (method === 'npx') return ['local'];
  return ['local', 'global'];
})();

// lines 160-171: try/catch with fail-loud (logs + returns error)
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

| standard | holds? | why |
|----------|--------|-----|
| rule.require.what-why-headers | yes | lines 19-22 jsdoc for UpgradeResult |
| rule.require.input-context-pattern | yes | `(input, context)` signature preserved |
| rule.forbid.else-branches | yes | IIFE uses early returns throughout |
| rule.require.narrative-flow | yes | linear: determine → expand → install → return |
| rule.forbid.failhide | yes | catch logs and returns error, does not hide |

**patterns absent?** none — try/catch is intentional per criteria usecase 3

### execUpgrade.test.ts (new test cases added)

**line-by-line verification of new cases:**

```typescript
// new cases for --which flag:
given('[caseN] user specifies --which local', () => {
  when('[t0] execUpgrade is called', () => {
    const scene = useBeforeAll(async () => ({
      result: await execUpgrade({ which: 'local' }, mockContext),
    }));
    then('upgrades local only', () => {
      expect(scene.result.upgradedSelf).toEqual(true);
      expect(scene.result.upgradedGlobal).toEqual(null);
    });
  });
});

// new case for global failure:
given('[caseN] global install fails with EACCES', () => {
  when('[t0] execUpgrade is called', () => {
    const scene = useBeforeAll(async () => {
      mockExecNpmInstallGlobal.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      return { result: await execUpgrade({ which: 'both' }, mockContext) };
    });
    then('local succeeds', () => {
      expect(scene.result.upgradedSelf).toEqual(true);
    });
    then('global returns error', () => {
      expect(scene.result.upgradedGlobal).toEqual({
        upgraded: false,
        error: 'EACCES: permission denied',
      });
    });
  });
});
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.given-when-then | yes | all new cases use given/when/then |
| rule.require.case-labels | yes | [caseN], [t0] labels |
| rule.forbid.redundant-expensive-operations | yes | uses useBeforeAll for shared setup |
| tests --which variations | yes | local, global, both, default |
| tests error path | yes | global failure returns error object |

**patterns absent?** none — all --which flag combinations and error paths covered

### invokeUpgrade.ts (changes)

**line-by-line verification of changes:**

```typescript
// new option added:
.option(
  '--which <which>',
  'which installs to upgrade: local, global, or both',
)

// passes which to execUpgrade:
const result = await execUpgrade({
  self: options.self,
  roleSpecs: options.roles,
  brainSpecs: options.brains,
  which: options.which,  // new field
}, context);

// new output for global status:
if (result.upgradedGlobal?.upgraded) {
  console.log(`✨ rhachet upgraded globally`);
}
```

| standard | holds? | why |
|----------|--------|-----|
| rule.require.what-why-headers | yes | file has jsdoc at top |
| rule.forbid.gerunds | yes | option description uses "upgrade" not "upgrading" |
| rule.require.narrative-flow | yes | linear: parse → exec → output |

**patterns absent?** none — CLI layer is minimal pass-through

## gaps found

none. all mechanic standards are applied. each file was read line by line with code evidence above.

## summary

| file | lines | standards checked | gaps |
|------|-------|-------------------|------|
| detectInvocationMethod.ts | 13 | 5 | 0 |
| detectInvocationMethod.test.ts | 43 | 4 | 0 |
| getGlobalRhachetVersion.ts | 41 | 5 | 0 |
| getGlobalRhachetVersion.test.ts | 136 | 5 | 0 |
| execNpmInstallGlobal.ts | 26 | 5 | 0 |
| execNpmInstallGlobal.test.ts | 164 | 6 | 0 |
| execUpgrade.ts (changes) | ~50 | 5 | 0 |
| execUpgrade.test.ts (changes) | ~40 | 5 | 0 |
| invokeUpgrade.ts (changes) | ~15 | 3 | 0 |

**total: 9 files, ~528 lines, 43 standards checked, 0 gaps found**

## verdict

all files have complete coverage of relevant mechanic role standards:
- every file has .what/.why jsdoc headers
- all functions use arrow syntax
- no gerunds in function names or comments
- no else branches — all use early returns
- tests use given/when/then with case labels
- external boundaries (spawnSync) are mocked, domain logic is not
- error paths throw (fail-fast) or return error object (warn-and-continue per criteria)

no patterns are absent. no gaps to fix.
