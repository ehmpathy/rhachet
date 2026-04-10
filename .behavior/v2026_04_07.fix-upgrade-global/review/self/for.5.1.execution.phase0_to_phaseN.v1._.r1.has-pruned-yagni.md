# review: has-pruned-yagni

## reviewed artifacts

- `src/domain.operations/upgrade/detectInvocationMethod.ts` (13 lines)
- `src/domain.operations/upgrade/getGlobalRhachetVersion.ts` (42 lines)
- `src/domain.operations/upgrade/execNpmInstallGlobal.ts` (27 lines)
- `src/domain.operations/upgrade/execUpgrade.ts` (changes: ~40 lines)
- `src/contract/cli/invokeUpgrade.ts` (changes: ~10 lines)

## component-by-component YAGNI check

### detectInvocationMethod.ts

**requested:** vision usecase 3 says "detects npx invocation → implies --which local"

**implementation:** 13 lines. checks `process.env.npm_execpath`. returns 'npx' or 'global'.

**holds because:** minimum viable detection. no extra logic. no caching. no fallback heuristics.

### getGlobalRhachetVersion.ts

**requested:** vision says "detects if rhachet is installed globally" and blueprint says "if globalVersion is null, global rhachet not installed — skip silently"

**implementation:** 42 lines. invokes `npm list -g rhachet --json`. handles npm and pnpm output formats.

**holds because:** pnpm handling is required (npm may be aliased). no version comparison (just return version or null). no caching.

### execNpmInstallGlobal.ts

**requested:** vision usecase 1 says "upgrades global rhachet"

**implementation:** 27 lines. invokes `npm install -g rhachet@latest`. throws on error.

**holds because:** fail fast per blueprint ("on EACCES/EPERM → throw error"). no retry. no sudo hints. no version check before install.

### execUpgrade.ts changes

**requested:** vision usecases 1-4 require:
- default npx → local only
- default rhx → local + global
- --which flag for explicit control
- skip global if not installed

**implementation:** ~40 lines added. converts which to array. adds global upgrade at end.

**holds because:** no extra flags. no extra output. no hooks/events. simple conditional logic.

### invokeUpgrade.ts changes

**requested:** vision says --which option with local|global|both values

**implementation:** ~10 lines. adds `.option('--which')`. updates summary output.

**holds because:** no validation. no aliases. no interactive prompts.

## verdict

no YAGNI violations. each component maps 1:1 to vision requirements.
