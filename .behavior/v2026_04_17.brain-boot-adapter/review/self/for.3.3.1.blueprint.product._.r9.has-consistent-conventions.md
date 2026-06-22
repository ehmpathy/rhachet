# self-review: has-consistent-conventions

## stone

3.3.1.blueprint.product

## review round

r9

## check

has-consistent-conventions

---

## extant conventions from codebase

### interface names (r9 update: now BrainCliConfigAdapter)

| extant | pattern |
|--------|---------|
| BrainHooksAdapter | Brain{Feature}Adapter (deprecated, migrated to BrainCliConfigAdapter) |
| BrainCliConfigAdapter | Brain{Feature}Adapter with daos: { hooks, boots, choice } |
| BrainHooksDao, BrainBootsDao, BrainChoiceDao | Brain{Feature}Dao |

### function names

| extant | pattern |
|--------|---------|
| genBrainHooksAdapterForClaudeCode | gen{Noun}For{Target} |
| genBrainCliConfigArtifact | gen{Noun} |
| getBrainHooks | get{Noun} |
| syncOneRoleHooksIntoOneBrainRepl | sync{What}Into{Where} |

### directory structure

| extant | pattern |
|--------|---------|
| src/domain.objects/ | domain objects (interfaces, types) |
| src/domain.operations/ | orchestrators, communicators |
| src/contract/cli/ | CLI entry points |
| blackbox/cli/ | acceptance tests |

### test file names

| extant | pattern |
|--------|---------|
| *.test.ts | unit tests |
| *.integration.test.ts | integration tests |
| *.acceptance.test.ts | acceptance tests |

---

## blueprint name checks

### name.1 = BrainCliConfigAdapter (r9 update)

**extant pattern:** Brain{Feature}Adapter (e.g., BrainHooksAdapter)

**blueprint name:** BrainCliConfigAdapter

**follows convention?** YES — CliConfig describes unified CLI configuration

**verdict:** consistent

---

### name.2 = BrainHooksDao, BrainBootsDao, BrainChoiceDao (r9 update)

**extant pattern:** Brain{Feature}Dao

**blueprint names:** BrainHooksDao, BrainBootsDao, BrainChoiceDao

**follows convention?** YES — each DAO handles one responsibility

**verdict:** consistent

---

### name.3 = genBrainConfigDir

**extant pattern:** gen{Noun} (e.g., genBrainCliConfigArtifact)

**blueprint name:** genBrainConfigDir

**follows convention?** YES — gen + noun

**verdict:** consistent

---

### name.4 = enrollBrainCli

**extant pattern:** {verb}{Target} (e.g., enrollBrainCli already exists)

**blueprint name:** extends extant enrollBrainCli

**follows convention?** YES — extant name, no change

**verdict:** consistent

---

### name.5 = test files

**extant pattern:** *.integration.test.ts for integration tests

**blueprint names:**
- genBrainConfigDir.integration.test.ts
- enrollBrainCli.integration.test.ts
- genBrainCliConfigArtifact.integration.test.ts
- invokeInit.integration.test.ts
- init.brain-config.acceptance.test.ts
- enroll.brain-config.acceptance.test.ts

**follows convention?** YES — all match extant patterns

**verdict:** consistent

---

### name.6 = directory structure

**extant pattern:** src/domain.objects/, src/domain.operations/, blackbox/cli/

**blueprint locations:**
- src/domain.objects/BrainBootsAdapter.ts
- src/domain.operations/init/genBrainConfigDir.ts
- src/domain.operations/enroll/enrollBrainCli.ts
- blackbox/cli/init.brain-config.acceptance.test.ts

**follows convention?** YES — all in correct directories

**verdict:** consistent

---

## found issues

none — all names and structures follow extant conventions.

---

## holds (non-issues)

### hold.1 = BrainCliConfigAdapter unifies hooks, boots, choice (r9 update)

extant BrainHooksAdapter deprecated. BrainCliConfigAdapter with daos: { hooks, boots, choice } unifies all CLI config concerns. this is intentional unification, not inconsistency.

### hold.2 = genBrainConfigDir follows gen{Noun} pattern

extant genBrainCliConfigArtifact uses gen{Noun} pattern. genBrainConfigDir follows the same pattern.

---

## verdict

**pass** — 6 name/structure conventions reviewed. all follow extant patterns. no divergence from codebase conventions.

---

## r9 update: BrainCliConfigAdapter name conventions

### name.7 = BrainCliConfigAdapter (r9 update)

**extant pattern:** Brain{Feature}Adapter

**blueprint name:** BrainCliConfigAdapter

**analysis:**
- extant: BrainHooksAdapter (deprecated)
- new: BrainCliConfigAdapter
- "CliConfig" describes unified CLI configuration (hooks + boots + choice)

**follows convention?** YES — same Brain{Feature}Adapter pattern

**verdict:** consistent

---

### name.8 = daos: { hooks, boots, choice } (r9 update)

**extant pattern:** Brain{Feature}AdapterDao (single dao)

**blueprint pattern:** adapter.daos.{hooks, boots, choice} (multiple daos)

**analysis:**
- extant BrainHooksAdapter has single `dao: BrainHooksAdapterDao`
- new BrainCliConfigAdapter has `daos: { hooks, boots, choice }`
- daos property is plural because multiple daos
- each dao follows Brain{Feature}Dao name pattern

**follows convention?** YES — same dao pattern, plural for multiple

**verdict:** consistent

---

### name.9 = genBrainCliConfigAdapterForClaudeCode (r9 update)

**extant pattern:** gen{Noun}For{Target}

**blueprint name:** genBrainCliConfigAdapterForClaudeCode

**analysis:**
- extant: genBrainHooksAdapterForClaudeCode
- new: genBrainCliConfigAdapterForClaudeCode
- same pattern, different feature name

**follows convention?** YES — exact same gen{Noun}For{Target} pattern

**verdict:** consistent

---

### holds (non-issues)

#### hold.r9.1 = "CliConfig" vs "Config"

considered: BrainConfigAdapter (shorter)
chose: BrainCliConfigAdapter (more specific)

"CliConfig" is more specific because:
- config could mean many things (env vars, settings, etc.)
- "Cli" clarifies this is for CLI tools (claude, opencode)
- matches the scope: only brain CLIs, not all brain config

#### hold.r9.2 = daos plural vs dao singular

extant BrainHooksAdapter uses `dao` (singular) because single dao.
new BrainCliConfigAdapter uses `daos` (plural) because multiple daos.

this is intentional divergence to signal "there are multiple daos here".

---

## session review: 2026-04-23

verified against blueprint conventions check:
- 9 name/structure conventions reviewed
- all follow extant patterns (Brain{Feature}Adapter, gen{Noun}For{Target})
- daos plural is intentional (multiple daos vs single dao)
- CliConfig is more specific than Config
- test files follow *.integration.test.ts pattern

**confirmed pass**.

---

### found issues (2026-04-23)

#### issue.r9.1 = review references stale daos structure

**problem:** r9 update references `daos: { hooks, boots, choice }` but blueprint evolved to `daos: { boots, hooks, auth, prefs }`

**blueprint says:**
- BrainCliConfigBootsDao (not BrainBootsDao)
- BrainCliConfigHooksDao (not BrainHooksDao)
- BrainCliConfigAuthDao (new)
- BrainCliConfigPrefsDao (new)

**verification:** checked blueprint filediff — all dao names use BrainCliConfig prefix

**status:** DOCUMENTATION GAP — r9 used short dao names. blueprint uses BrainCliConfig prefixed names for consistency.

#### issue.r9.2 = BrainCli entity name convention

**problem:** r9 did not review BrainCli entity name convention

**blueprint says:** BrainCli entity in domain.objects (peer to BrainAtom, BrainRepl)

**analysis:**
- extant: BrainAtom, BrainRepl
- new: BrainCli
- pattern: Brain{Capability}

**follows convention?** YES — same Brain{Capability} pattern as peers

**status:** ADDED to verification

---

### additional name convention verification (2026-04-23)

verified each new name in blueprint filediff against extant conventions:

#### domain.objects layer names

| blueprint name | extant pattern | follows? |
|----------------|----------------|----------|
| BrainCliConfigAdapter | Brain{Feature}Adapter | YES |
| BrainCliConfigBootsDao | Brain{Context}{Feature}Dao | YES |
| BrainCliConfigHooksDao | Brain{Context}{Feature}Dao | YES |
| BrainCliConfigAuthDao | Brain{Context}{Feature}Dao | YES |
| BrainCliConfigPrefsDao | Brain{Context}{Feature}Dao | YES |
| BrainCliConfig | Brain{Feature} | YES |
| BrainCli | Brain{Capability} (peer to BrainAtom, BrainRepl) | YES |

#### domain.operations layer names

| blueprint name | extant pattern | follows? |
|----------------|----------------|----------|
| genBrainCliConfigAdapterForClaudeCode | gen{Noun}For{Target} | YES |
| genBrainCliForClaudeCode | gen{Noun}For{Target} | YES |
| genClaudeMdContent | gen{Noun} | YES |
| genBrainCliConfigArtifact | gen{Noun} | YES |
| asScopeHash | as{Noun} (transformer) | YES |
| getBootRoleResourcesContent | get{Noun} | YES |
| getBrainCliConfigAdapterByConfigImplicit | get{Noun}By{Key} | YES |
| getBrainCliBySlug | get{Noun}By{Key} | YES |

#### test file names

| blueprint name | extant pattern | follows? |
|----------------|----------------|----------|
| genBrainCliConfigAdapterForClaudeCode.test.ts | {name}.test.ts | YES |
| genBrainCliForClaudeCode.test.ts | {name}.test.ts | YES |
| genClaudeMdContent.test.ts | {name}.test.ts | YES |
| genBrainCliConfigArtifact.integration.test.ts | {name}.integration.test.ts | YES |
| init.brain-config.acceptance.test.ts | {feature}.acceptance.test.ts | YES |
| enroll.brain-config.acceptance.test.ts | {feature}.acceptance.test.ts | YES |

**status:** all 18 names follow extant conventions.

---

### holds (non-issues) for name conventions

#### hold.r9.3 = BrainCliConfig prefix on daos

daos use BrainCliConfig prefix (not just Brain prefix) because:
- BrainHooksAdapterDao was extant pattern
- BrainCliConfigHooksDao maintains same structure
- prefix clarifies scope (CLI config daos, not general brain daos)

#### hold.r9.4 = BrainCli as peer entity name

BrainCli follows Brain{Capability} pattern:
- BrainAtom: atomic API call
- BrainRepl: read-execute-print loop
- BrainCli: CLI spawn capability

all three are brain capabilities that interact with the brain in different ways.

---

### directory structure convention verification (2026-04-23)

verified each file location in blueprint filediff against extant directory conventions:

#### src/domain.objects/ — interfaces and domain entities

| blueprint file | belongs here? | rationale |
|----------------|---------------|-----------|
| BrainCliConfigAdapter.ts | YES | adapter interface (like BrainHooksAdapter) |
| BrainCliConfigBootsDao.ts | YES | dao interface |
| BrainCliConfigHooksDao.ts | YES | dao interface |
| BrainCliConfigAuthDao.ts | YES | dao interface |
| BrainCliConfigPrefsDao.ts | YES | dao interface |
| BrainCliConfig.ts | YES | domain entity |
| BrainCli.ts | YES | domain entity (peer to BrainAtom, BrainRepl) |

**status:** all files correctly in domain.objects/

#### src/domain.operations/ — orchestrators and transformers

| blueprint file | belongs here? | rationale |
|----------------|---------------|-----------|
| init/genBrainCliConfigArtifact.ts | YES | orchestrator (like enroll/) |
| init/asScopeHash.ts | YES | transformer |
| invoke/getBootRoleResourcesContent.ts | YES | transformer (extends bootRoleResources) |
| config/getBrainCliConfigAdapterByConfigImplicit.ts | YES | lookup (like getBrainHooksAdapter) |
| config/getBrainCliBySlug.ts | YES | lookup |
| enroll/enrollBrainCli.ts | YES | extant file, extended |
| brains/syncOneRoleHooksIntoOneBrainRepl.ts | YES | extant file, extended |
| manifest/assertRegistryBootHooksDeclared.ts | REMOVE | obsolete |

**status:** all files correctly in domain.operations/

#### src/contract/cli/ — CLI entry points

| blueprint file | belongs here? | rationale |
|----------------|---------------|-----------|
| invokeInit.ts | YES | extant file, extended |
| invokeUpgrade.ts | YES | extant file, extended |

**status:** all files correctly in contract/cli/

#### src/_topublish/ — plugin packages

| blueprint file | belongs here? | rationale |
|----------------|---------------|-----------|
| rhachet-brains-anthropic/src/genBrainCliConfigAdapterForClaudeCode.ts | YES | claude-specific factory |
| rhachet-brains-anthropic/src/genBrainCliForClaudeCode.ts | YES | claude-specific factory |
| rhachet-brains-anthropic/src/boots/genClaudeMdContent.ts | YES | claude-specific transformer |
| rhachet-brains-opencode/src/genBrainCliConfigAdapterForOpencode.ts | YES | opencode-specific factory |
| rhachet-brains-opencode/src/genBrainCliForOpencode.ts | YES | opencode-specific factory |

**status:** all plugin files correctly in _topublish/rhachet-brains-*/

#### blackbox/ — acceptance tests

| blueprint file | belongs here? | rationale |
|----------------|---------------|-----------|
| .test/assets/with-brain-config-default/ | YES | fixture directory |
| .test/assets/with-brain-config-scoped/ | YES | fixture directory |
| cli/init.brain-config.acceptance.test.ts | YES | acceptance test |
| cli/enroll.brain-config.acceptance.test.ts | YES | acceptance test |

**status:** all test files correctly in blackbox/

---

### summary of directory convention verification

| layer | files | correct? |
|-------|-------|----------|
| domain.objects | 7 | YES |
| domain.operations | 8 (7 valid + 1 remove) | YES |
| contract/cli | 2 | YES |
| _topublish | 5 | YES |
| blackbox | 4 | YES |

**result:** all 26 file locations follow extant directory conventions.
