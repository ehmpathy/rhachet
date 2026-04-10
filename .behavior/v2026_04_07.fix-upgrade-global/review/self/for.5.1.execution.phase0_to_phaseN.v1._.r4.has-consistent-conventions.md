# review: has-consistent-conventions

## reviewed for divergence from extant name conventions

examined new code for alignment with extant name patterns in the codebase.

## search methodology

grep for function name prefixes in domain.operations/:
- `detect*` → detectPackageManager, detectBrainReplsInRepo
- `get*` → getLocalRefDependencies, getRoleBriefs, getAvailableBrains
- `exec*` → execNpmInstall, execUpgrade

grep for CLI option patterns in contract/cli/:
- `--repo <slug>`, `--role <slug>`, `--key <keyname>`, `--env <env>`

## name analysis

### function names

| new function | pattern | extant examples | verdict |
|--------------|---------|-----------------|---------|
| detectInvocationMethod | detect* | detectPackageManager, detectBrainReplsInRepo | consistent |
| getGlobalRhachetVersion | get* | getLocalRefDependencies, getRoleBriefs | consistent |
| execNpmInstallGlobal | exec* | execNpmInstall, execUpgrade | consistent |

**holds because:** all three new functions follow extant verb prefix conventions in the upgrade/ directory and broader domain.operations/.

### file names

| new file | pattern | verdict |
|----------|---------|---------|
| detectInvocationMethod.ts | camelCase.ts | consistent |
| detectInvocationMethod.test.ts | camelCase.test.ts | consistent |
| getGlobalRhachetVersion.ts | camelCase.ts | consistent |
| getGlobalRhachetVersion.test.ts | camelCase.test.ts | consistent |
| execNpmInstallGlobal.ts | camelCase.ts | consistent |
| execNpmInstallGlobal.test.ts | camelCase.test.ts | consistent |

**holds because:** all files follow the extant camelCase format with .test.ts suffix for tests.

### CLI option names

| new option | pattern | extant similar | verdict |
|------------|---------|----------------|---------|
| `--which <which>` | `--name <value>` | `--repo <slug>`, `--env <env>` | consistent |

**question considered:** is `--which` the right name?

examined alternatives:
- `--scope` — could be confused with npm scope (@org/pkg)
- `--target` — too generic
- `--install` — could be confused with install action
- `--which` — clear question "which installs to upgrade?"

**conclusion:** `--which` follows the pattern of question-based option names and clearly indicates a choice between local/global/both.

### return type fields

| new field | extant pattern | verdict |
|-----------|----------------|---------|
| `upgradedGlobal` | `upgradedSelf`, `upgradedRoles`, `upgradedBrains` | consistent |

**holds because:** follows extant `upgraded*` name pattern in UpgradeResult interface.

### type values

| new values | context | extant pattern | verdict |
|------------|---------|----------------|---------|
| `'npx' \| 'global'` | detectInvocationMethod return | union of string literals | consistent |
| `'local' \| 'global' \| 'both'` | --which option values | union of string literals | consistent |

**holds because:** follows extant pattern of string literal unions for constrained value types.

## deeper question: term overload for "local"

**observation:** the term "local" is used in two contexts:

| context | term | meaning |
|---------|------|---------|
| package.json deps | `localRefDeps` | dependencies with `file:` or `link:` specifiers |
| npm install scope | `--which local` | project-level install (in cwd, vs global `-g`) |

**question:** does this overload cause confusion?

**analysis:**
1. the contexts are distinct — `localRefDeps` is about dependency specifiers, `--which local` is about install scope
2. the code separates these concerns clearly — `localRefDeps` is used for filtering, `whichTargets` is used for install routing
3. the user-facing `--which local|global` aligns with npm terminology (`npm install` vs `npm install -g`)
4. users understand "local" to mean "project-level" in npm context

**conclusion:** the term overload is acceptable because:
- contexts are distinct and don't overlap in the same code paths
- user-facing API uses npm's established terminology
- internal variables clearly indicate their purpose (`localRefDeps` vs `whichTargets`)

**not changed:** aligning with npm terminology for user-facing API takes precedence over avoiding internal term similarity.

## verdict

no divergence from extant conventions found. all new names follow established patterns:

- function names use correct verb prefixes (detect*, get*, exec*)
- file names use camelCase with .test.ts suffix
- CLI option follows `--name <value>` pattern
- return type fields follow `upgraded*` pattern
- type values use string literal unions
- term "local" is overloaded but in distinct, non-overlapping contexts
