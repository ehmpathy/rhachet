# review: has-pruned-backcompat

## reviewed artifacts

re-read each file looking specifically for backwards compatibility patterns:

- `src/domain.operations/upgrade/detectInvocationMethod.ts`
- `src/domain.operations/upgrade/getGlobalRhachetVersion.ts`
- `src/domain.operations/upgrade/execNpmInstallGlobal.ts`
- `src/domain.operations/upgrade/execUpgrade.ts`
- `src/contract/cli/invokeUpgrade.ts`

## backwards compat patterns searched for

1. deprecated flag aliases (e.g., `--global` as alias for `--which global`)
2. version checks that preserve old behavior
3. fallback code paths "to be safe"
4. migration operations
5. legacy output formats

## findings: none

### execUpgrade.ts

**searched:** does the default behavior preserve old behavior?

**found:** no. when `--which` is absent, new logic runs:
```typescript
const method = detectInvocationMethod();
if (method === 'npx') return ['local'];
return ['local', 'global'];
```

**holds because:** vision explicitly says "rhx upgrade → global + local by default". this is the new intended behavior, not backwards compat.

### invokeUpgrade.ts

**searched:** are there deprecated aliases?

**found:** no. only `--which <which>` with values 'local', 'global', 'both'. no aliases like `--skip-global` or `--global-only`.

**holds because:** vision specifies exactly these three values. no legacy flags mentioned.

### getGlobalRhachetVersion.ts

**searched:** is there fallback version detection "to be safe"?

**found:** returns `null` when global not installed. no fallback to check PATH, no fallback to check ~/.npm.

**holds because:** blueprint says "if globalVersion is null, global rhachet not installed — skip silently". simple null check, no compat hacks.

## deeper question: should we have preserved the old default?

**old behavior:** `rhx upgrade` → local only
**new behavior:** `rhx upgrade` → local + global

**considered:** should we add a flag to preserve old behavior as default?

**answer:** no. vision explicitly addresses this:

> "users may expect `rhx upgrade` in a project to ONLY affect that project"

and prescribes the solution:

> "`--which local` for users who want isolation"

the vision intentionally changes the default because:
1. keeping global and local in sync is the better default
2. users who want isolation have explicit control via `--which local`
3. no silent degradation — if global fails, we fail fast and surface the error

**conclusion:** the behavior change is intentional, not a regression. backwards compat would be adding code "to be safe" without explicit request.

## verdict

no backwards compat code found. the default behavior change is intentional per vision. users who want old behavior use `--which local`.
