# self-review: has-consistent-mechanisms (r8)

## reflection

i re-examine the blueprint with fresh eyes, as if for the first time. the question: do new mechanisms duplicate extant functionality?

---

## what the guide asks

for each new mechanism:
1. does the codebase already have a mechanism that does this?
2. do we duplicate extant utilities or patterns?
3. could we reuse an extant component instead of a new one?

---

## mechanism 1: detectInvocationMethod

### what it does

reads `process.env.npm_execpath` → returns 'npx' or 'global'

### search results

| search | results |
|--------|---------|
| `npm_execpath` in codebase | 0 files |
| invocation detection pattern | 0 files |

### question 1: does extant mechanism exist?

no. this capability does not exist in the codebase.

### question 2: do we duplicate extant utilities?

no. no extant utility detects invocation method.

### question 3: could we reuse an extant component?

no extant component to reuse.

### why it holds

this is genuinely new functionality required by the wish:
> "npx rhx = local only; rhx = global and local"

no duplication.

---

## mechanism 2: getGlobalRhachetVersion

### what it does

runs `npm list -g rhachet --json` → parses and returns version or null

### search results

| search | results |
|--------|---------|
| `npm list.*-g` in codebase | 0 files |
| global version detection | 0 files |
| `rhachet.*version` patterns | 0 relevant |

### question 1: does extant mechanism exist?

no. the codebase has no mechanism to query global npm state.

### question 2: do we duplicate extant utilities?

no. no extant utility queries global npm.

### question 3: could we reuse an extant component?

no extant component to reuse.

### why it holds

this is genuinely new functionality required by the vision:
> "already current → no network call"

no duplication.

---

## mechanism 3: execNpmInstallGlobal

### what it does

runs `npm install -g rhachet@latest` → returns { upgraded: boolean; hint: string | null }

### search results

| search | results |
|--------|---------|
| `spawnSync` in codebase | 24 files |
| `execNpmInstall` | 1 file (local install) |

### extant mechanism: execNpmInstall.ts

```typescript
// pattern: detect pm, run install, throw on error
const pm = detectPackageManager({ cwd });
const result = spawnSync(pm, ['install', ...packagesLatest], { stdio: 'inherit' });
if (result.status !== 0) throw new UpgradeExecutionError(...)
```

### question 1: does extant mechanism exist?

partial. execNpmInstall exists but serves different purpose (local install).

### question 2: do we duplicate extant utilities?

examined differences:

| aspect | execNpmInstall (extant) | execNpmInstallGlobal (new) |
|--------|------------------------|---------------------------|
| purpose | local project install | global npm install |
| package manager | detects pnpm/npm | always npm |
| stdio | inherit (realtime output) | pipe (capture stderr) |
| on error | throws exception | returns result object |
| EACCES handle | none | returns hint |
| cwd | context.cwd | not applicable (global) |

the differences are behavioral, not cosmetic.

### question 3: could we reuse execNpmInstall?

examined reuse options:

**option A: add global flag to execNpmInstall**
- would require conditional: if global then npm else detectPm
- would require conditional: if global then return else throw
- would require conditional: if global then pipe else inherit
- result: more complex than separate function

**option B: extract shared spawnSync wrapper**
- shared code is ~5 lines
- abstraction overhead exceeds benefit
- rule.prefer.wet-over-dry says wait for 3+ usages

**option C: separate functions**
- simple, clear purpose
- easy to test independently
- aligns with single responsibility

### why it holds

separate functions is correct choice:
- different error strategies
- different pm logic
- different stdio requirements
- extraction creates unnecessary abstraction

---

## mechanism 4: UpgradeResult interface extension

### what it does

adds `upgradedGlobal: { upgraded: boolean; hint: string | null } | null` to result

### question 1: does extant mechanism exist?

yes — extends extant UpgradeResult interface.

### question 2: do we duplicate?

no — we extend, not duplicate.

### why it holds

follows open/closed principle: extend interface, don't create parallel one.

---

## mechanism 5: --which flag

### what it does

adds cli option `--which local|global|both`

### search results

| search | results |
|--------|---------|
| `--which` in cli | 0 files |
| similar flag patterns | extant options in invokeUpgrade |

### question 1: does extant mechanism exist?

no. no extant --which flag.

### question 2: do we duplicate extant patterns?

no. we follow extant option patterns (e.g., .option()).

### why it holds

new functionality following extant patterns.

---

## summary

| mechanism | extant? | reusable? | verdict |
|-----------|---------|-----------|---------|
| detectInvocationMethod | no | n/a | ✓ new |
| getGlobalRhachetVersion | no | n/a | ✓ new |
| execNpmInstallGlobal | partial | no (different behavior) | ✓ justified |
| UpgradeResult extension | yes | yes (extends) | ✓ extends |
| --which flag | no | n/a | ✓ new |

## conclusion

no unjustified duplication:
- truly new mechanisms have no extant equivalents
- similar mechanism (execNpmInstall) has different enough behavior to justify separation
- extant patterns are extended, not duplicated

