# self-review: has-proper-directory-decomposition

review that directories follow the layered decomposition pattern and that subdomains have proper namespace via subdirectories.

---

## blueprint file structure examined

the blueprint introduces files in two locations:

### 1. action source: `keyrack/firewall/`

```
keyrack/firewall/
  action.yml              # github action manifest
  package.json            # @actions/core dependency
  dist/
    index.js              # ncc bundle output
  src/
    index.ts              # action entry point
    parseSecretsInput.ts  # transformer
    filterToManifestKeys.ts # transformer
    processOneSecret.ts   # orchestrator
    exportGrantedSecrets.ts # communicator
    *.test.ts             # tests collocated
```

### 2. extant keyrack operations: `src/domain.operations/keyrack/`

the blueprint marks components as `[REUSE]` — imported from:
- `src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/mechAdapterAwsSso.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica.ts`
- `src/access/daos/daoKeyrackRepoManifest/`

and `[EXTEND]` — modified in place:
- `src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica.ts` (ghs_* bug fix)

---

## layer structure check

**question**: does the blueprint violate layer boundaries?

### extant layer structure

```
src/
  contract/           # public interfaces
    cli/              # keyrack cli commands
  access/             # infrastructure
    daos/             # daoKeyrackRepoManifest, daoKeyrackHostManifest
  domain.objects/     # KeyrackGrantAttempt, KeyrackHostManifest, etc.
  domain.operations/  # keyrack operations
    keyrack/
      adapters/       # mechanism and vault adapters
      cli/            # cli output format
      daemon/         # daemon service/sdk
      recipient/      # recipient management
      session/        # unlock/relock/status
```

### action placement: outside src/

the firewall action lives at `keyrack/firewall/`, not inside `src/`.

**is this correct?** yes.

**why?**

GitHub Actions with Node.js runtime need:
1. `action.yml` at package root (not inside src/)
2. `package.json` with @actions/core
3. `dist/index.js` bundled via ncc

if the action lived inside `src/`:
- no place for action.yml (must be at action root)
- deps would pollute main package.json
- ncc bundle would have wrong output path

the action imports FROM `src/` but does not live IN `src/`. this is the correct pattern for Node.js actions.

### action internal structure: flat

the action's `src/` has 4 files plus index.ts:
- `parseSecretsInput.ts`
- `filterToManifestKeys.ts`
- `processOneSecret.ts`
- `exportGrantedSecrets.ts`

**is flat structure acceptable?** yes — for 4 files.

**when would nested structure be required?**
- 10+ files in one directory
- distinct sub-features (auth/, cache/, etc.)
- shared utilities across features

4 operations for a single action is small enough that flat structure is correct.

---

## subdomain namespace check

**question**: are related operations grouped together?

### extant keyrack namespace structure

```
src/domain.operations/keyrack/
  adapters/
    mechanisms/           # mech-specific adapters
      aws.sso/            # multi-file subdomain
      mechAdapterGithubApp.ts
      mechAdapterReplica.ts
    vaults/               # vault-specific adapters
      1password/          # multi-file subdomain
      aws.config/
      os.daemon/
      os.direct/
      os.envvar/
      os.secure/
      github.secrets/
  daemon/                 # daemon subsystem
    infra/
    sdk/
    svc/
  cli/                    # cli output
  recipient/              # recipient ops
  session/                # session ops
  *.ts                    # root-level ops (leaf files)
```

**pattern observed**:
- subdirectories for multi-file features (daemon/, adapters/mechanisms/aws.sso/)
- leaf files at root for standalone operations (asKeyrackKeySlug.ts)

### where should action files live?

the action operations are:
1. **action-specific** — only make sense in action context
2. **not reusable** — by keyrack CLI or other subsystems
3. **small scope** — 4 operations for one entry point

**options considered**:

| placement | pros | cons |
|-----------|------|------|
| `keyrack/firewall/src/` | isolated, own bundle | separate from keyrack domain |
| `src/domain.operations/keyrack/firewall/` | with keyrack domain | complicates bundle, pollutes src/ |

**decision in blueprint**: `keyrack/firewall/src/`

**why it holds**: action code MUST live outside `src/` because:
1. action.yml must be at action root
2. ncc bundle must be self-contained
3. @actions/core is action-only dep

the action imports reusable pieces FROM `src/domain.operations/keyrack/` (adapters, domain objects). the action-specific orchestration lives in `keyrack/firewall/`.

---

## consistency with extant structure

### extant actions in repo

```
.github/actions/
  keyrack/          # composite action (shell wrapper)
  please-release/   # composite action
  test-shards-setup/ # composite action
```

these are composite actions that shell out to CLI. they live in `.github/actions/`.

### firewall action differs

the firewall action is a Node.js action (`runs: node20`) with:
- typescript source
- npm dependencies
- ncc bundle

**precedent check**: Node.js actions with build steps typically live in dedicated directories outside `.github/actions/`. examples from github marketplace:
- `actions/checkout` — dedicated repo
- `actions/cache` — dedicated repo
- complex actions get their own directory structure

`keyrack/firewall/` follows this pattern. it's a Node.js action with build infrastructure, not a simple composite wrapper.

---

## conclusion

### layer check: PASS

| concern | status |
|---------|--------|
| action lives outside src/ | **correct** — action.yml requires root placement |
| action imports from src/ | **correct** — reuses domain.operations, domain.objects |
| no src/ pollution | **correct** — @actions/core stays in action's package.json |

### subdomain check: PASS

| concern | status |
|---------|--------|
| flat structure for 4 files | **acceptable** — below threshold for subdirectories |
| action-specific code isolated | **correct** — not mixed with CLI code |
| reusable pieces in src/ | **correct** — adapters stay in domain.operations |

### consistency check: PASS

| concern | status |
|---------|--------|
| differs from .github/actions/ | **justified** — Node.js action vs composite |
| follows Node.js action pattern | **correct** — own directory with build infra |

no directory decomposition issues found. the blueprint correctly separates action-specific code from reusable domain code.
