# self-review r10: has-proper-directory-decomposition

a junior recently modified files in this repo. we need to carefully review that directories follow the layered decomposition pattern.

---

## codebase search: what is the extant directory structure?

### keyrack subdomain structure

```
$ tree -L 2 src/domain.operations/keyrack/

src/domain.operations/keyrack/
├── adapters/
│   ├── mechanisms/          # mech adapters (PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_*, etc)
│   └── vaults/              # vault adapters (aws.config, 1password, os.secure, etc)
├── cli/                     # cli-related keyrack operations
├── daemon/                  # daemon-related keyrack operations
├── asKeyrackKeyEnv.ts       # transformers at keyrack root
├── asKeyrackKeyName.ts
├── asKeyrackKeyOrg.ts
├── asKeyrackKeySlug.ts
└── ...
```

**observation:** the keyrack subdomain has clear categories:
- `adapters/` — contains `mechanisms/` and `vaults/`
- `cli/` — cli-specific operations
- `daemon/` — daemon-specific operations
- root-level transformers — `as*` pure functions

### vault adapters structure

```
$ tree -L 1 src/domain.operations/keyrack/adapters/vaults/

src/domain.operations/keyrack/adapters/vaults/
├── 1password/
├── aws.config/        # ← blueprint modifies files here
├── aws.ssm/
├── github.secrets/
├── os.daemon/
├── os.direct/
├── os.envvar/
├── os.secure/
└── index.ts
```

**observation:** each vault type has its own subdirectory. the `index.ts` barrel exports the vault adapter registry.

---

## blueprint's proposed changes

from `3.3.1.blueprint.product.yield.md`:

```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── [~] update vaultAdapterAwsConfig.ts
└── [~] update vaultAdapterAwsConfig.test.ts
```

---

## review: layer structure

### question: is `domain.operations/` the correct layer for vault adapters?

per the layer guide:
```
src/
  contract/           # public interfaces (cli/, api/, sdk/)
  access/             # infrastructure (daos/, sdks/, svcs/)
  domain.objects/     # domain declarations
  domain.operations/  # domain behavior
  infra/              # adapters
```

**analysis:**

vault adapters are domain behavior, not:
- `contract/` — not a public interface (cli commands are in `contract/cli/`)
- `access/` — not raw infrastructure (vault adapters call access layer internally)
- `domain.objects/` — not a declaration
- `infra/` — the `infra/` layer holds generic adapters; vault adapters are domain-specific

**verdict:** `domain.operations/` is the correct layer for vault adapters.

---

## review: subdomain namespace

### question: are the files properly namespaced?

**the path:**
```
src/domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.ts
    ─────────────────  ───────  ────────  ─────  ─────────  ────────────────────
           layer        subdomain category  subcat  type     filename
```

**depth check:**
- level 1: `domain.operations/` — layer
- level 2: `keyrack/` — subdomain
- level 3: `adapters/` — category (mechanisms vs vaults)
- level 4: `vaults/` — subcategory
- level 5: `aws.config/` — specific vault type
- level 6: `vaultAdapterAwsConfig.ts` — the file

**comparison with extant:**

| vault type | path |
|------------|------|
| 1password | `adapters/vaults/1password/vaultAdapter1Password.ts` |
| aws.config | `adapters/vaults/aws.config/vaultAdapterAwsConfig.ts` |
| os.secure | `adapters/vaults/os.secure/vaultAdapterOsSecure.ts` |

all vault adapters follow the same structure.

**verdict:** the blueprint's files are properly namespaced.

---

## review: consistency with extant

### question: does the blueprint match extant patterns?

| aspect | extant | blueprint |
|--------|--------|-----------|
| directory | `vaults/$type/` | `vaults/aws.config/` |
| file name | `vaultAdapter$Type.ts` | `vaultAdapterAwsConfig.ts` |
| test file | collocated `*.test.ts` | collocated `*.test.ts` |
| integration test | collocated `*.integration.test.ts` | (not modified) |

**verdict:** the blueprint matches extant patterns exactly.

---

## summary

| check | result | evidence |
|-------|--------|----------|
| layer placement | correct | vault adapters are domain operations, not access |
| subdomain namespace | correct | 5 levels of nested directories match extant |
| consistency | matches | same structure as other vault adapters |

---

## why it holds

**no directory decomposition issues.** articulation:

1. **layer is correct** — vault adapters encapsulate how to get/set/unlock credentials. this is domain behavior, not access-layer infrastructure. the extant codebase places all vault adapters in `domain.operations/keyrack/adapters/vaults/`.

2. **namespace depth is consistent** — the blueprint's path (`domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.ts`) has 5 levels of directory depth. all extant vault adapters have the same depth.

3. **no flat structure** — the codebase does not dump vault adapters at `domain.operations/` root. they are organized by subdomain → category → subcategory → type.

4. **file name pattern matches** — extant vault adapters are named `vaultAdapter$Type.ts`. the blueprint modifies `vaultAdapterAwsConfig.ts` which follows this pattern.

5. **no new directories** — the blueprint modifies extant files in an extant directory. no new directory structure decisions are made.

the blueprint follows proper directory decomposition as established by extant vault adapters.
