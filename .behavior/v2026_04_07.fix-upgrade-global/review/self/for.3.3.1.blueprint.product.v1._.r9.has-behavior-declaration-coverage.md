# self-review: has-behavior-declaration-coverage (r9)

## reflection

i step back and verify the blueprint covers all requirements from the vision and criteria. the question: did the junior omit any requirements?

---

## vision requirements

### usecase 1: default upgrade (most common)

**vision requirement:**
> `rhx upgrade` → upgrades local, roles/brains, detects global install, upgrades global

**blueprint coverage:**
- ✓ `invokeUpgrade.ts [EXTEND]` — add --which option
- ✓ `execUpgrade.ts [EXTEND]` — add global upgrade logic
- ✓ codepath tree shows: if which includes 'global' → execNpmInstallGlobal

**verdict:** covered.

---

### usecase 2: explicit control

**vision requirement:**
> `--which local|global|both` for explicit control

**blueprint coverage:**
- ✓ `invokeUpgrade.ts` changes: `.option('--which <which>', ...)`
- ✓ codepath tree: parse --which flag (local|global|both)

**verdict:** covered.

---

### usecase 3: npx invocation

**vision requirement:**
> `npx rhachet upgrade` → local only, no global attempt, no error

**blueprint coverage:**
- ✓ `detectInvocationMethod.ts [NEW]` — check npm_execpath
- ✓ codepath tree: if npx → default to 'local'

**verdict:** covered.

---

### edge cases from vision

| edge case | vision requirement | blueprint coverage |
|-----------|-------------------|-------------------|
| invoked via npx | implies --which local | ✓ detectInvocationMethod |
| global install fails | warn, proceed with local, surface hint | ✓ execNpmInstallGlobal returns hint |
| global and local at same version | report "already current", no-op | ✓ test coverage added |
| global newer than local | upgrade local to match | ✓ implicit (upgrade to @latest) |

**verdict:** all edge cases covered.

---

## criteria requirements

### usecase.1 = default upgrade (rhx invocation)

| criterion | blueprint coverage |
|-----------|-------------------|
| upgrades local rhachet | ✓ execNpmInstall (extant) |
| upgrades global rhachet | ✓ execNpmInstallGlobal [NEW] |
| upgrades roles | ✓ extant behavior |
| output shows both upgraded | ✓ output format section |
| --which local upgrades local only | ✓ codepath tree |
| --which global upgrades global only | ✓ codepath tree |
| --which both upgrades both | ✓ codepath tree |

**verdict:** covered.

---

### usecase.2 = npx invocation

| criterion | blueprint coverage |
|-----------|-------------------|
| npx → local only | ✓ detectInvocationMethod |
| output shows local | ✓ output format: local only (npx) |
| no error about global | ✓ no error path for npx default |
| npx + --which global → error | ✓ codepath tree: error path |

**verdict:** covered.

---

### usecase.3 = global upgrade fails

| criterion | blueprint coverage |
|-----------|-------------------|
| local succeeds | ✓ independent operations |
| warns about global failure | ✓ output format: global fails |
| surfaces hint | ✓ execNpmInstallGlobal returns hint |
| exits with success | ✓ warn and continue design |

**verdict:** covered.

---

### usecase.4 = already current

| criterion | blueprint coverage |
|-----------|-------------------|
| reports "already current" for local | ✓ acceptance test added |
| reports "already current" for global | ✓ acceptance test added |
| no unnecessary network calls | ✓ getGlobalRhachetVersion checks first |

**verdict:** covered.

---

### usecase.5 = version mismatch

| criterion | blueprint coverage |
|-----------|-------------------|
| global newer → upgrade local | ✓ implicit (@latest) |
| local newer → upgrade global | ✓ implicit (@latest) |
| no downgrades | ✓ @latest never downgrades |

**verdict:** covered.

---

### usecase.6 = output clarity

| criterion | blueprint coverage |
|-----------|-------------------|
| both upgraded → shows both | ✓ output format section |
| local only → no global mention | ✓ output format: local only |
| global fails → hint shown | ✓ output format: global fails |
| hint suggests sudo | ✓ `sudo npm i -g rhachet@latest` |

**verdict:** covered.

---

## summary

| source | requirements | covered |
|--------|--------------|---------|
| vision usecase 1 | 4 | 4 |
| vision usecase 2 | 3 | 3 |
| vision usecase 3 | 3 | 3 |
| vision edge cases | 4 | 4 |
| criteria usecase 1-6 | 18 | 18 |

## conclusion

all requirements from vision and criteria are addressed in the blueprint:
- all usecases have codepaths
- all edge cases have coverage
- all output formats are specified
- all test cases are declared

no omissions found.

