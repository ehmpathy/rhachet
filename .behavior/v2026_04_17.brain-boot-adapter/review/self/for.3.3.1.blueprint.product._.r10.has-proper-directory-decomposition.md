# self-review: has-proper-directory-decomposition

## stone

3.3.1.blueprint.product

## review round

r10

## check

has-proper-directory-decomposition

---

## extant directory structure

### domain.objects/

most interfaces at root level:
- BrainHooksAdapter.ts (root)
- BrainHooksAdapterDao.ts (root)
- other Brain* files (root)

one subdomain for keyrack-specific objects:
- keyrack/ (subdomain)

### domain.operations/

24 subdomain directories:
- enroll/ — enrollment operations
- init/ — initialization operations
- boot/ — boot operations
- brains/ — brain sync operations
- etc.

### contract/cli/

CLI entry points.

### blackbox/cli/

Acceptance tests.

---

## blueprint file placement check

### file.1 = BrainCliConfigAdapter.ts (r10 update)

**blueprint location:** src/domain.objects/BrainCliConfigAdapter.ts

**extant pattern:** BrainHooksAdapter.ts is at domain.objects root

**correct layer?** YES — domain objects go in domain.objects/

**correct subdomain?** YES — Brain* interfaces are at root, not in subdomain

**verdict:** correct placement

---

### file.2 = BrainHooksDao.ts, BrainBootsDao.ts, BrainChoiceDao.ts (r10 update)

**blueprint location:** src/domain.objects/Brain*Dao.ts

**extant pattern:** BrainHooksAdapterDao.ts is at domain.objects root

**correct layer?** YES — domain objects go in domain.objects/

**correct subdomain?** YES — Brain* interfaces are at root

**verdict:** correct placement

---

### file.3 = genBrainConfigDir.ts

**blueprint location:** src/domain.operations/init/genBrainConfigDir.ts

**extant pattern:** init/ subdomain exists for initialization operations

**correct layer?** YES — orchestrators go in domain.operations/

**correct subdomain?** YES — init operations go in init/

**verdict:** correct placement

---

### file.4 = enrollBrainCli.ts (extend)

**blueprint location:** src/domain.operations/enroll/enrollBrainCli.ts

**extant pattern:** enroll/ subdomain exists for enrollment operations

**correct layer?** YES — orchestrators go in domain.operations/

**correct subdomain?** YES — enrollment operations go in enroll/

**verdict:** correct placement

---

### file.5 = genBrainCliConfigArtifact.ts (extend)

**blueprint location:** src/domain.operations/enroll/genBrainCliConfigArtifact.ts

**extant pattern:** already exists in enroll/ subdomain

**correct layer?** YES — already in correct layer

**correct subdomain?** YES — already in correct subdomain

**verdict:** correct placement

---

### file.6 = invokeInit.ts (extend)

**blueprint location:** src/contract/cli/invokeInit.ts

**extant pattern:** CLI entry points in contract/cli/

**correct layer?** YES — CLI contracts in contract/cli/

**correct subdomain?** N/A — contract/cli/ is flat

**verdict:** correct placement

---

### file.7 = init.brain-config.acceptance.test.ts

**blueprint location:** blackbox/cli/init.brain-config.acceptance.test.ts

**extant pattern:** CLI acceptance tests in blackbox/cli/

**correct layer?** YES — acceptance tests in blackbox/cli/

**correct subdomain?** N/A — blackbox/cli/ is flat

**verdict:** correct placement

---

### file.8 = enroll.brain-config.acceptance.test.ts

**blueprint location:** blackbox/cli/enroll.brain-config.acceptance.test.ts

**extant pattern:** CLI acceptance tests in blackbox/cli/

**correct layer?** YES — acceptance tests in blackbox/cli/

**correct subdomain?** N/A — blackbox/cli/ is flat

**verdict:** correct placement

---

## found issues

none — all files placed in correct layers and subdomains consistent with extant structure.

---

## holds (non-issues)

### hold.1 = domain.objects/ uses root placement for Brain* files (r10 update)

extant pattern places Brain* interfaces at domain.objects root, not in a subdomain. blueprint follows this pattern for BrainCliConfigAdapter and BrainHooksDao, BrainBootsDao, BrainChoiceDao.

### hold.2 = domain.operations/ uses subdomain directories

extant pattern uses init/, enroll/, etc. as subdomain directories. blueprint places files in correct subdomains.

---

## verdict

**pass** — 8 file placements reviewed. all follow extant layer and subdomain structure. no directory decomposition issues.

---

## r10 update: BrainCliConfigAdapter directory placement

### file.9 = BrainCliConfigAdapter.ts (r10 update)

**blueprint location:** src/domain.objects/BrainCliConfigAdapter.ts

**extant pattern:** Brain* interfaces at domain.objects root

**correct layer?** YES — unified adapter interface in domain.objects/

**correct subdomain?** YES — Brain* interfaces are at root (not in subdomain)

**verdict:** correct placement

---

### file.10 = BrainHooksDao.ts, BrainBootsDao.ts, BrainChoiceDao.ts (r10 update)

**blueprint location:** src/domain.objects/Brain*Dao.ts

**extant pattern:** BrainHooksAdapterDao.ts at domain.objects root

**correct layer?** YES — dao interfaces in domain.objects/

**correct subdomain?** YES — Brain* interfaces are at root

**verdict:** correct placement

---

### file.11 = genBrainCliConfigAdapterForClaudeCode.ts (r10 update)

**blueprint location:** src/domain.operations/config/genBrainCliConfigAdapterForClaudeCode.ts

**question:** should this be in config/ subdomain or brains/ subdomain?

**extant pattern analysis:**
- getBrainHooksAdapterByConfigImplicit.ts is in src/domain.operations/config/
- brain-related config operations go in config/ subdomain
- not brains/ subdomain (that's for brain sync operations)

**verdict:** correct placement — config/ subdomain for brain config operations

---

### holds (non-issues)

#### hold.r10.1 = domain.objects/ is flat for Brain* interfaces

extant pattern: Brain* interfaces (BrainHooksAdapter, BrainHooksAdapterDao) are at domain.objects root, not in a subdomain. blueprint follows this pattern.

why flat? Brain* interfaces are shared across multiple subdomains. subdomain would imply ownership by one domain.

#### hold.r10.2 = domain.operations/config/ is correct subdomain

config/ subdomain contains:
- getBrainHooksAdapterByConfigImplicit.ts (extant)
- genBrainCliConfigAdapterForClaudeCode.ts (new)
- getBrainCliConfigAdapterByConfigImplicit.ts (new, replaces hooks lookup)

all brain config operations in one subdomain enables cohesion.

---

## session review: 2026-04-23

verified against blueprint directory decomposition check:
- 11 file placements reviewed
- all in correct layers (domain.objects, domain.operations, contract/cli, blackbox/cli)
- Brain* interfaces at domain.objects root (follows extant pattern)
- config/ subdomain for brain config operations
- genBrainCliConfigAdapterForClaudeCode in config/ subdomain (correct)

**confirmed pass**.

---

### found issues (2026-04-23)

#### issue.r10.1 = r10 update references stale dao names

**problem:** r10 update references `BrainHooksDao, BrainBootsDao, BrainChoiceDao` but blueprint uses `BrainCliConfigHooksDao, BrainCliConfigBootsDao, BrainCliConfigAuthDao, BrainCliConfigPrefsDao`

**verification:** blueprint filediff shows:
- `[+] BrainCliConfigBootsDao.ts` (not BrainBootsDao)
- `[+] BrainCliConfigHooksDao.ts` (not BrainHooksDao)
- `[+] BrainCliConfigAuthDao.ts` (not BrainChoiceDao)
- `[+] BrainCliConfigPrefsDao.ts` (new)

**status:** DOCUMENTATION GAP — r10 update used short dao names. all daos correctly placed at domain.objects root per extant pattern.

---

### complete directory decomposition verification (2026-04-23)

verified each [+] and [~] file in blueprint filediff against layer and subdomain rules:

#### domain.objects layer (interfaces at root)

| file | correct layer? | correct subdomain? | extant pattern? |
|------|---------------|-------------------|-----------------|
| BrainCliConfigAdapter.ts | YES — domain.objects | YES — root (Brain* pattern) | YES |
| BrainCliConfigBootsDao.ts | YES — domain.objects | YES — root (Brain* pattern) | YES |
| BrainCliConfigHooksDao.ts | YES — domain.objects | YES — root (Brain* pattern) | YES |
| BrainCliConfigAuthDao.ts | YES — domain.objects | YES — root (Brain* pattern) | YES |
| BrainCliConfigPrefsDao.ts | YES — domain.objects | YES — root (Brain* pattern) | YES |
| BrainCliConfig.ts | YES — domain.objects | YES — root (Brain* pattern) | YES |
| BrainCli.ts | YES — domain.objects | YES — root (Brain* pattern) | YES |

**result:** 7 domain.objects files correctly at root (not in subdomain), follows extant Brain* pattern.

#### domain.operations layer (subdomains)

| file | correct layer? | subdomain | extant pattern? |
|------|---------------|-----------|-----------------|
| init/genBrainCliConfigArtifact.ts | YES | init/ | YES — init operations go here |
| init/asScopeHash.ts | YES | init/ | YES — init transformers go here |
| invoke/getBootRoleResourcesContent.ts | YES | invoke/ | YES — extends bootRoleResources |
| config/getBrainCliConfigAdapterByConfigImplicit.ts | YES | config/ | YES — replaces hooks lookup |
| config/getBrainCliBySlug.ts | YES | config/ | YES — brain config lookups |
| enroll/enrollBrainCli.ts | YES | enroll/ | YES — extant file, extended |
| brains/syncOneRoleHooksIntoOneBrainRepl.ts | YES | brains/ | YES — extant file, extended |

**result:** 7 domain.operations files correctly in subdomain directories, follows extant pattern.

#### plugin layer (_topublish)

| file | correct layer? | subdomain | extant pattern? |
|------|---------------|-----------|-----------------|
| rhachet-brains-anthropic/src/genBrainCliConfigAdapterForClaudeCode.ts | YES | brains plugin | YES |
| rhachet-brains-anthropic/src/genBrainCliForClaudeCode.ts | YES | brains plugin | YES |
| rhachet-brains-anthropic/src/boots/genClaudeMdContent.ts | YES | brains/boots | YES — claude-specific boots |
| rhachet-brains-opencode/src/genBrainCliConfigAdapterForOpencode.ts | YES | brains plugin | YES |
| rhachet-brains-opencode/src/genBrainCliForOpencode.ts | YES | brains plugin | YES |

**result:** 5 plugin files correctly in _topublish packages, each brain-specific.

#### contract layer

| file | correct layer? | subdomain | extant pattern? |
|------|---------------|-----------|-----------------|
| contract/cli/invokeInit.ts | YES | cli/ | YES — extant CLI entry point |
| contract/cli/invokeUpgrade.ts | YES | cli/ | YES — extant CLI entry point |

**result:** 2 contract files correctly in contract/cli/, follows extant pattern.

#### blackbox layer (acceptance tests)

| file | correct layer? | subdomain | extant pattern? |
|------|---------------|-----------|-----------------|
| .test/assets/with-brain-config-default/ | YES | .test/assets/ | YES — fixture directory |
| .test/assets/with-brain-config-scoped/ | YES | .test/assets/ | YES — fixture directory |
| cli/init.brain-config.acceptance.test.ts | YES | cli/ | YES — CLI acceptance test |
| cli/enroll.brain-config.acceptance.test.ts | YES | cli/ | YES — CLI acceptance test |

**result:** 4 blackbox items correctly placed.

---

### layer decomposition summary

| layer | files | flat or subdomain | correct? |
|-------|-------|-------------------|----------|
| domain.objects | 7 | flat (Brain* root) | YES |
| domain.operations | 7 | subdomain (init/, config/, enroll/, brains/, invoke/) | YES |
| _topublish | 5 | package/src/ | YES |
| contract | 2 | cli/ | YES |
| blackbox | 4 | .test/assets/, cli/ | YES |

**total:** 25 file placements verified. all follow extant layer and subdomain structure.

---

### holds (non-issues) for directory decomposition

#### hold.r10.3 = domain.objects flat for shared interfaces

Brain* interfaces are shared across multiple subdomains (enroll, init, config). root placement avoids false ownership by any one subdomain.

#### hold.r10.4 = boots/ subdomain in rhachet-brains-anthropic

`boots/genClaudeMdContent.ts` is correctly namespaced in boots/ subdomain within the plugin package. this is brain-specific boot content transformer.

#### hold.r10.5 = config/ subdomain for brain config operations

extant `getBrainHooksAdapterByConfigImplicit.ts` is in config/ subdomain. blueprint places new config operations (getBrainCliConfigAdapterByConfigImplicit, getBrainCliBySlug) in same subdomain.

---

### verdict (2026-04-23)

**pass** — 25 file placements verified across 5 layers. all follow extant layer structure and subdomain patterns. no directory decomposition issues found.

---

### cross-check: extant subdomain directories (2026-04-23)

verified blueprint subdomain choices against actual codebase subdomain directories:

#### domain.operations subdomains (actual)

```
src/domain.operations/
├── boot/           # boot operations
├── brains/         # brain sync operations
├── config/         # brain config lookups
├── enroll/         # enrollment operations
├── hooks/          # hook generation
├── init/           # initialization operations
├── invoke/         # invocation operations
├── manifest/       # manifest operations
├── ...
```

blueprint places files in:
- init/ — asScopeHash, genBrainCliConfigArtifact — YES extant
- config/ — getBrainCliConfigAdapterByConfigImplicit, getBrainCliBySlug — YES extant
- enroll/ — enrollBrainCli — YES extant
- brains/ — syncOneRoleHooksIntoOneBrainRepl — YES extant
- invoke/ — getBootRoleResourcesContent — YES extant

**result:** all blueprint subdomains are extant in codebase. no new subdomains proposed.

#### domain.objects structure (actual)

```
src/domain.objects/
├── BrainHooksAdapter.ts        # at root
├── BrainHooksAdapterDao.ts     # at root
├── BrainAtom.ts                # at root
├── BrainRepl.ts                # at root
├── keyrack/                    # one subdomain
│   ├── KeyrackKey.ts
│   └── ...
├── ...
```

blueprint places Brain* files at root (not in subdomain) — matches extant pattern.

**result:** blueprint follows extant domain.objects structure.

#### plugin package structure (actual)

```
src/_topublish/
├── rhachet-brains-anthropic/
│   ├── src/
│   │   ├── genBrainHooksAdapterForClaudeCode.ts  # at src root
│   │   └── ...
├── rhachet-brains-opencode/
│   ├── src/
│   │   └── ...
```

blueprint places new files at src root and creates boots/ subdomain for claude-specific transformer:
- genBrainCliConfigAdapterForClaudeCode.ts — src root (matches extant)
- genBrainCliForClaudeCode.ts — src root (matches extant)
- boots/genClaudeMdContent.ts — new subdomain (justified: brain-specific boot content)

**result:** blueprint follows extant plugin structure with one justified new subdomain.

---

### subdomain nesting analysis (2026-04-23)

checked that blueprint does not violate subdomain nesting rules:

| blueprint file | subdomain depth | max allowed | ok? |
|----------------|-----------------|-------------|-----|
| init/asScopeHash.ts | 1 | 2 | YES |
| init/genBrainCliConfigArtifact.ts | 1 | 2 | YES |
| config/getBrainCliConfigAdapterByConfigImplicit.ts | 1 | 2 | YES |
| config/getBrainCliBySlug.ts | 1 | 2 | YES |
| enroll/enrollBrainCli.ts | 1 | 2 | YES |
| brains/syncOneRoleHooksIntoOneBrainRepl.ts | 1 | 2 | YES |
| invoke/getBootRoleResourcesContent.ts | 1 | 2 | YES |
| boots/genClaudeMdContent.ts (plugin) | 1 | 2 | YES |

**result:** no deep nesting violations. all files at depth 1 within their layer subdomain.

---

### final decomposition verdict (2026-04-23)

| check | result | evidence |
|-------|--------|----------|
| layer placement | PASS | 25 files in correct layers |
| subdomain choice | PASS | all subdomains extant in codebase |
| nesting depth | PASS | max depth 1 (within limits) |
| Brain* root pattern | PASS | 7 interfaces at domain.objects root |
| extant consistency | PASS | matches codebase directory structure |

**all directory decomposition checks pass.**
