# self-review: has-consistent-conventions (r9)

## reflection

i step back and re-examine the blueprint conventions from first principles. the question: does every name follow extant patterns?

---

## extant convention inventory

### file name patterns

| pattern | extant examples |
|---------|-----------------|
| camelCase.ts | execNpmInstall.ts, execUpgrade.ts, expandRoleSupplierSlugs.ts |
| verb prefix | exec*, expand*, get*, detect*, discover* |

### function name patterns

| pattern | semantics |
|---------|-----------|
| exec* | execute shell command or operation |
| get* | retrieve data (getOne*, getAll*) |
| detect* | detect environment state |
| expand* | expand specs to details |
| discover* | discover resources |

### interface name patterns

| pattern | extant examples |
|---------|-----------------|
| PascalCase | UpgradeResult, RoleSupplierSlug, BrainSupplierSlug |
| field: upgraded* | upgradedSelf, upgradedRoles, upgradedBrains |

### cli option name patterns

| pattern | extant examples |
|---------|-----------------|
| --single-word | --self, --roles, --brains |
| kebab-case | n/a in invokeUpgrade |

---

## blueprint names vs conventions

### detectInvocationMethod

| aspect | convention | blueprint | match |
|--------|------------|-----------|-------|
| file name | camelCase.ts | detectInvocationMethod.ts | ✓ |
| verb prefix | detect* | detect* | ✓ |
| purpose | environment detection | invocation method detection | ✓ |

**verdict:** aligns with extant detectPackageManager pattern.

---

### getGlobalRhachetVersion

| aspect | convention | blueprint | match |
|--------|------------|-----------|-------|
| file name | camelCase.ts | getGlobalRhachetVersion.ts | ✓ |
| verb prefix | get* | get* | ✓ |
| cardinality | getOne*/getAll* | getGlobal* | see note |

**note on cardinality:** extant getLocalRefDependencies uses get* without One/All suffix. this is acceptable for single-value returns where cardinality is implicit in the name (Global implies one value).

**verdict:** aligns with extant get* convention.

---

### execNpmInstallGlobal

| aspect | convention | blueprint | match |
|--------|------------|-----------|-------|
| file name | camelCase.ts | execNpmInstallGlobal.ts | ✓ |
| verb prefix | exec* | exec* | ✓ |
| name pattern | execNpmInstall + scope | execNpmInstallGlobal | ✓ |

**comparison to extant:**
- execNpmInstall = local npm install
- execNpmInstallGlobal = global npm install

the Global suffix parallels how local is implicit in execNpmInstall.

**verdict:** aligns with extant exec* convention, extends execNpmInstall pattern.

---

### UpgradeResult.upgradedGlobal

| aspect | convention | blueprint | match |
|--------|------------|-----------|-------|
| field prefix | upgraded* | upgradedGlobal | ✓ |
| type pattern | boolean or array | object with upgraded + hint | see note |

**note on type:** extant fields are:
- upgradedSelf: boolean
- upgradedRoles: RoleSupplierSlug[]
- upgradedBrains: BrainSupplierSlug[]

blueprint adds:
- upgradedGlobal: { upgraded: boolean; hint: string | null } | null

the nested object differs from extant flat types. this is justified:
- global upgrade can fail with hint (EACCES)
- null when not attempted (npx invocation)
- extant fields have no failure mode with hint

**verdict:** prefix aligns; type shape is justified extension.

---

### --which flag

| aspect | convention | blueprint | match |
|--------|------------|-----------|-------|
| name pattern | --single-word | --which | ✓ |
| values | n/a (new pattern) | local\|global\|both | new |

**note:** no extant flag controls scope like this. the closest patterns:
- --self (boolean)
- --roles (boolean)
- --brains (boolean)

--which introduces enum-style values. this is a justified extension — no extant pattern covers this use case.

**verdict:** follows single-word convention; enum values are new but necessary.

---

### output format

| aspect | convention | blueprint | match |
|--------|------------|-----------|-------|
| emoji | 📦 | 📦 | ✓ |
| tree structure | treestruct | treestruct | ✓ |
| scope label | (pm) | (npm -g) | ✓ |

**comparison:**
- extant: `📦 upgrade (pnpm)`
- blueprint: `📦 upgrade (npm -g)`

the `-g` suffix clearly indicates global scope.

**verdict:** aligns with extant treestruct output convention.

---

## summary table

| name | extant pattern | alignment |
|------|----------------|-----------|
| detectInvocationMethod | detect* | ✓ |
| getGlobalRhachetVersion | get* | ✓ |
| execNpmInstallGlobal | exec* | ✓ |
| upgradedGlobal | upgraded* | ✓ (type justified) |
| --which | --single-word | ✓ (enum is extension) |
| output format | treestruct | ✓ |

## conclusion

all names follow extant conventions:
- verb prefixes match (detect*, get*, exec*)
- field prefix matches (upgraded*)
- output format matches (treestruct with 📦)
- extensions are justified (enum flag, nested type)

no convention divergence found.

