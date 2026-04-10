# self-review: has-consistent-conventions (r8)

## reflection

i examine the blueprint for divergence from extant names and patterns. the question: do we use consistent conventions?

---

## extant conventions in upgrade domain

searched `src/domain.operations/upgrade/`:

| file | prefix | pattern |
|------|--------|---------|
| execNpmInstall.ts | exec* | executes shell command |
| execUpgrade.ts | exec* | executes operation |
| expandRoleSupplierSlugs.ts | expand* | expands specs to details |
| *RoleSpecsToPackages.ts | * | transforms specs to packages |
| *BrainsToPackages.ts | * | transforms specs to packages |
| getLocalRefDependencies.ts | get* | retrieves data |
| discoverLinkedRoles.ts | discover* | discovers resources |
| detectPackageManager | detect* | detects environment |

---

## name review

### detectInvocationMethod.ts

**blueprint name:** `detectInvocationMethod`

**extant convention:** `detect*` prefix for environment detection
- extant: `detectPackageManager` in execNpmInstall.ts

**alignment:**
- ✓ prefix matches (`detect*`)
- ✓ verb+noun pattern matches
- ✓ camelCase matches

**why it holds:** follows extant detect* convention.

---

### getGlobalRhachetVersion.ts

**blueprint name:** `getGlobalRhachetVersion`

**extant convention:** `get*` prefix for retrieval
- extant: `getLocalRefDependencies`

**alignment:**
- ✓ prefix matches (`get*`)
- ✓ getGlobal* vs getLocal* is parallel
- ✓ camelCase matches

**why it holds:** follows extant get* convention, parallel to getLocalRefDependencies.

---

### execNpmInstallGlobal.ts

**blueprint name:** `execNpmInstallGlobal`

**extant convention:** `exec*` prefix for execution
- extant: `execNpmInstall`, `execUpgrade`

**examined alternatives:**
| option | matches extant? | clarity |
|--------|-----------------|---------|
| `execNpmInstallGlobal` | ✓ exec* prefix | global scope clear |
| `execGlobalNpmInstall` | ✓ exec* prefix | global before npm |
| `installGlobalNpm` | ✗ no exec* | verb changes |

**alignment:**
- ✓ prefix matches (`exec*`)
- ✓ follows execNpmInstall* pattern
- ✓ Global suffix parallels local context

**why it holds:** follows extant exec* convention, extends execNpmInstall pattern.

---

### UpgradeResult interface

**blueprint addition:** `upgradedGlobal: { upgraded: boolean; hint: string | null } | null`

**extant pattern:**
```typescript
interface UpgradeResult {
  upgradedSelf: boolean;
  upgradedRoles: RoleSupplierSlug[];
  upgradedBrains: BrainSupplierSlug[];
}
```

**alignment:**
- ✓ `upgraded*` prefix matches extant fields
- ✓ nullable type matches pattern (global may not apply)

**why it holds:** follows extant `upgraded*` field convention.

---

### --which flag

**blueprint option:** `--which local|global|both`

**extant cli patterns in invokeUpgrade:**
```
--self
--roles
--brains
```

**examined alternatives:**
| option | parallel to extant? | clarity |
|--------|---------------------|---------|
| `--which` | new pattern | explicit scope control |
| `--global` | ✓ boolean flag | but conflicts with --which both |
| `--scope` | new pattern | less common term |

**alignment:**
- `--which` is new but necessary — no extant flag controls local vs global scope
- follows single-word option pattern like `--self`, `--roles`, `--brains`

**why it holds:** new flag but follows extant single-word option pattern.

---

### output format

**blueprint output:**
```
📦 upgrade (npm -g)
   └── rhachet@latest
```

**extant output (execNpmInstall.ts):**
```
📦 upgrade (pnpm)
   ├── rhachet@latest
   └── rhachet-roles-ehmpathy@latest
```

**alignment:**
- ✓ same emoji (📦)
- ✓ same tree structure
- ✓ `(npm -g)` parallels `(pnpm)` or `(npm)`

**why it holds:** follows extant treestruct output convention.

---

## summary

| name | extant pattern | alignment | verdict |
|------|----------------|-----------|---------|
| detectInvocationMethod | detect* | ✓ | matches |
| getGlobalRhachetVersion | get* | ✓ | matches |
| execNpmInstallGlobal | exec* | ✓ | matches |
| upgradedGlobal field | upgraded* | ✓ | matches |
| --which flag | new (justified) | ✓ | new but follows style |
| output format | treestruct | ✓ | matches |

## conclusion

all names align with extant conventions:
- prefixes match (`detect*`, `get*`, `exec*`, `upgraded*`)
- patterns match (verb+noun, treestruct output)
- new terms are justified (--which for scope control)

no divergence from extant conventions.

