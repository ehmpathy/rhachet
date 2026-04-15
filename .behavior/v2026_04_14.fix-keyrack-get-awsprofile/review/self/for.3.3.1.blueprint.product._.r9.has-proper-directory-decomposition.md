# self-review r9: has-proper-directory-decomposition

a junior recently modified files in this repo. we need to carefully review that directories follow the layered decomposition pattern.

---

## blueprint's proposed files

from `3.3.1.blueprint.product.yield.md`:

```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── [~] update vaultAdapterAwsConfig.ts
└── [~] update vaultAdapterAwsConfig.test.ts
```

**observation:** the blueprint modifies extant files only. no new files are created.

---

## extant directory structure

```
src/domain.operations/keyrack/adapters/vaults/
├── 1password/
│   ├── vaultAdapter1Password.ts
│   ├── vaultAdapter1Password.test.ts
│   └── vaultAdapter1Password.integration.test.ts
├── aws.config/
│   ├── vaultAdapterAwsConfig.ts
│   ├── vaultAdapterAwsConfig.test.ts
│   └── vaultAdapterAwsConfig.integration.test.ts
├── github.secrets/
│   └── vaultAdapterGithubSecrets.ts
├── os.daemon/
│   └── vaultAdapterOsDaemon.ts
├── os.direct/
│   └── vaultAdapterOsDirect.ts
└── os.envvar/
    └── ...
```

---

## layer structure check

### question: are files in the correct layer?

| file | proposed layer | correct? |
|------|----------------|----------|
| vaultAdapterAwsConfig.ts | domain.operations/ | yes |
| vaultAdapterAwsConfig.test.ts | domain.operations/ | yes |

**analysis:**

vault adapters are domain operations — they encapsulate how to get/set/unlock credentials from specific vault backends. they belong in `domain.operations/`, not:
- `access/` — vault adapters are not raw sdks or daos
- `contract/` — vault adapters are not public interfaces
- `infra/` — vault adapters are not generic infrastructure

**verdict:** layer placement is correct.

---

## subdomain namespace check

### question: are files namespaced under a subdomain directory?

```
src/domain.operations/
  └── keyrack/              # subdomain
      └── adapters/         # category
          └── vaults/       # subcategory
              └── aws.config/  # specific vault
                  ├── vaultAdapterAwsConfig.ts
                  └── vaultAdapterAwsConfig.test.ts
```

**analysis:**

the blueprint's files are namespaced 4 levels deep:
1. `keyrack/` — the keyrack subdomain
2. `adapters/` — the adapters category within keyrack
3. `vaults/` — the vaults subcategory within adapters
4. `aws.config/` — the specific vault type

this is proper namespace decomposition.

**verdict:** subdomain namespace is correct.

---

## consistency check

### question: does the blueprint match extant directory patterns?

| aspect | extant pattern | blueprint |
|--------|----------------|-----------|
| vault location | `vaults/$type/vaultAdapter$Type.ts` | `vaults/aws.config/vaultAdapterAwsConfig.ts` |
| test location | collocated in same directory | collocated in same directory |
| name pattern | `vaultAdapter$Type.ts` | `vaultAdapterAwsConfig.ts` |

**verdict:** the blueprint matches extant directory patterns exactly.

---

## summary

| check | status |
|-------|--------|
| layer placement | correct (domain.operations/) |
| subdomain namespace | correct (keyrack/adapters/vaults/aws.config/) |
| consistency with extant | matches exactly |

---

## why it holds

**no directory decomposition issues.** articulation:

1. **files are in the correct layer** — vault adapters are domain operations, not access or contract. `domain.operations/` is the correct layer.

2. **files are properly namespaced** — the blueprint uses 4 levels of namespace (`keyrack/adapters/vaults/aws.config/`) which matches extant decomposition.

3. **no flat structure** — vault adapters are not dumped at `domain.operations/` root. they are organized by subdomain (keyrack), category (adapters), subcategory (vaults), and type (aws.config).

4. **matches extant patterns** — extant vault adapters use the same directory structure. the blueprint modifies files in place without restructure.

5. **no new files** — the blueprint only updates extant files. no new directory decisions are made.

the blueprint follows proper directory decomposition. no issues detected.
