# self-review: has-behavior-declaration-coverage (r10)

## reflection

i am the reviewer, not the author. i re-examine the blueprint against the vision and criteria with fresh eyes. the question: are all requirements addressed?

---

## vision requirements checklist

### usecase 1: default upgrade

| vision requirement | blueprint location | status |
|--------------------|-------------------|--------|
| upgrades local install | execUpgrade.ts: if which includes 'local' → execNpmInstall | ✓ |
| upgrades roles | execUpgrade.ts: expandRoleSupplierSlugs | ✓ |
| upgrades brains | execUpgrade.ts: expandBrainsToPackages | ✓ |
| detects global install | getGlobalRhachetVersion.ts [NEW] | ✓ |
| upgrades global install | execNpmInstallGlobal.ts [NEW] | ✓ |
| output shows both | output format section: success (both upgraded) | ✓ |

**why it holds:** each requirement maps to a specific file change or new file in the blueprint.

---

### usecase 2: explicit control

| vision requirement | blueprint location | status |
|--------------------|-------------------|--------|
| --which local | invokeUpgrade.ts: .option('--which <which>') | ✓ |
| --which global | invokeUpgrade.ts: .option('--which <which>') | ✓ |
| --which both | invokeUpgrade.ts: .option('--which <which>') | ✓ |
| default is both | codepath tree: if global → default to 'both' | ✓ |

**why it holds:** the --which option is explicitly declared with all three values.

---

### usecase 3: npx invocation

| vision requirement | blueprint location | status |
|--------------------|-------------------|--------|
| detects npx | detectInvocationMethod.ts: check npm_execpath | ✓ |
| defaults to local | codepath tree: if npx → default to 'local' | ✓ |
| no global attempt | codepath tree: only if which includes 'global' | ✓ |
| no error | output format: local only (no error section) | ✓ |

**why it holds:** npx detection is a new file with explicit behavior.

---

### edge cases from vision

| edge case | vision says | blueprint coverage |
|-----------|-------------|-------------------|
| npx + --which global | error | codepath tree: if npx AND --which includes 'global' → error |
| global fails (permissions) | warn, proceed, hint | execNpmInstallGlobal: on EACCES → return { upgraded: false, hint } |
| already current | no network calls | getGlobalRhachetVersion: checks version first |
| version mismatch | no downgrades | @latest never downgrades |

**why it holds:** each edge case has explicit coverage in codepath tree or file design.

---

## criteria requirements checklist

### usecase.1: default upgrade (rhx invocation)

| criterion | blueprint |
|-----------|-----------|
| upgrades local rhachet | ✓ execNpmInstall |
| upgrades global rhachet | ✓ execNpmInstallGlobal |
| upgrades roles | ✓ extant |
| output shows both | ✓ output format |
| --which local → local only | ✓ codepath |
| --which global → global only | ✓ codepath |
| --which both → both | ✓ codepath |

---

### usecase.2: npx invocation

| criterion | blueprint |
|-----------|-----------|
| npx → local only | ✓ detectInvocationMethod |
| output shows local | ✓ output format |
| no error about global | ✓ no error path |
| npx + --which global → error | ✓ codepath |

---

### usecase.3: global upgrade fails

| criterion | blueprint |
|-----------|-----------|
| local succeeds | ✓ independent operations |
| warns about global | ✓ output format |
| surfaces hint | ✓ execNpmInstallGlobal |
| exits success | ✓ design |

---

### usecase.4: already current

| criterion | blueprint |
|-----------|-----------|
| reports "already current" | ✓ acceptance test |
| no unnecessary network | ✓ version check first |

---

### usecase.5: version mismatch

| criterion | blueprint |
|-----------|-----------|
| no downgrades | ✓ @latest |

---

### usecase.6: output clarity

| criterion | blueprint |
|-----------|-----------|
| both → shows both | ✓ output format |
| local only → no global | ✓ output format |
| global fails → hint | ✓ output format |

---

## gaps found

none. every requirement from vision and criteria maps to explicit blueprint coverage.

---

## summary

| source | total requirements | covered |
|--------|-------------------|---------|
| vision usecase 1 | 6 | 6 |
| vision usecase 2 | 4 | 4 |
| vision usecase 3 | 4 | 4 |
| vision edge cases | 4 | 4 |
| criteria usecases 1-6 | 18 | 18 |
| **total** | **36** | **36** |

## conclusion

the blueprint covers all 36 requirements from vision and criteria. no omissions found. the junior did not skip any part of the spec.

