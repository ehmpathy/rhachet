# self-review: has-pruned-yagni

## stone

3.3.1.blueprint.product

## review round

r5

## check

has-pruned-yagni

---

## wish requirements

from 0.wish.md, explicit requests:
1. BrainBootsAdapter (rather than BrainHooksAdapter)
2. briefs and skills boot into a cacheable location
3. boots adapters respect the `rhx enroll` pattern
4. support different roles booted via --roles
5. order repo=.this/role=any boots AFTER published role boots

---

## component review

### component.1 = BrainCliConfigAdapter.ts (r5 update)

**explicitly requested?** YES + user elevated — wish requested "BrainBootsAdapter symmetric to BrainHooksAdapter", user feedback elevated to unified BrainCliConfigAdapter that deprecates BrainHooksAdapter

**minimum viable?** YES — interface only, with daos: { hooks, boots, choice }

**abstraction for future flexibility?** NO — this migrates extant BrainHooksAdapter, not new abstraction

**feature added "while we're here"?** NO — user explicitly requested unification

**premature optimization?** NO — simplifies codebase (2 adapters → 1 adapter)

**verdict:** KEEP — user-directed simplification

---

### component.2 = BrainHooksDao.ts, BrainBootsDao.ts, BrainChoiceDao.ts

**explicitly requested?** DERIVED — decomposed from BrainCliConfigAdapter.daos

**minimum viable?** YES — interfaces only, each handles distinct responsibility

**abstraction for future flexibility?** NO — these ARE the core contracts

**feature added "while we're here"?** daos.choice is new to fill gap user identified ("who tells enroll how to invoke CLI?")

**premature optimization?** NO — required for unified adapter to work

**verdict:** KEEP — required by BrainCliConfigAdapter

---

### component.3 = genBrainConfigDir.ts

**explicitly requested?** YES — wish line 22: "briefs and skills get booted into a cacheable location"

**minimum viable?** YES — single orchestrator to generate config directory

**abstraction for future flexibility?** NO — direct implementation, no extra layers

**feature added "while we're here"?** NO — this is the core operation

**premature optimization?** NO — required for the feature

**verdict:** KEEP — required to generate CLAUDE.md config

---

### component.4 = enrollBrainCli.ts changes

**explicitly requested?** YES — wish line 23: "boots adapters respect the `rhx enroll` pattern"

**minimum viable?** YES — adds CLAUDE_CONFIG_DIR env var to spawn call

**abstraction for future flexibility?** NO — direct change to spawn

**feature added "while we're here"?** NO — required for CLAUDE.md to load

**premature optimization?** NO — CLAUDE_CONFIG_DIR is the only mechanism

**verdict:** KEEP — required for rhx enroll to use CLAUDE.md

---

### component.5 = genBrainCliConfigArtifact.ts changes

**explicitly requested?** YES — wish line 27: "support that same behavior to have different roles booted"

**minimum viable?** YES — generates scoped config for custom role sets

**abstraction for future flexibility?** NO — direct extension of the artifact generator

**feature added "while we're here"?** NO — required for --roles flag support

**premature optimization?** NO — needed for scoped configs

**verdict:** KEEP — required for custom role enrollment

---

### component.6 = assertRegistryBootHooksDeclared removal

**explicitly requested?** DERIVED — obsolete with CLAUDE.md approach

**minimum viable?** YES — removes dead code

**abstraction for future flexibility?** N/A — removal

**feature added "while we're here"?** NO — cleanup of obsolete code

**premature optimization?** NO — reduces maintenance burden

**verdict:** KEEP (removal) — dead code removal

---

### component.7 = invokeInit.ts changes

**explicitly requested?** YES — wish mentions `rhx init` pattern for config generation

**minimum viable?** YES — adds --hooks flag to generate config dir

**abstraction for future flexibility?** NO — direct flag addition

**feature added "while we're here"?** NO — required for init workflow

**premature optimization?** NO — needed for the feature

**verdict:** KEEP — required for init workflow

---

### component.8 = .credentials.json symlink

**explicitly requested?** DERIVED — needed for shared auth across configs

**minimum viable?** YES — symlink is simpler than copy

**abstraction for future flexibility?** NO — direct symlink

**feature added "while we're here"?** NO — required for auth to work

**premature optimization?** NO — simpler than alternatives

**verdict:** KEEP — required for auth

---

### component.9 = .gitignore for scoped configs

**explicitly requested?** DERIVED — prevents accidental commit of user-specific configs

**minimum viable?** YES — one file write

**abstraction for future flexibility?** NO — direct file write

**feature added "while we're here"?** NO — required for git hygiene

**premature optimization?** NO — simple safeguard

**verdict:** KEEP — required for git hygiene

---

### component.10 = boot order section

**explicitly requested?** YES — wish line 34: "order the repo=.this/role=any boots AFTER the published role boots"

**minimum viable?** YES — documents the order requirement

**abstraction for future flexibility?** NO — documentation

**feature added "while we're here"?** NO — explicitly requested

**premature optimization?** NO — documentation

**verdict:** KEEP — explicitly requested

---

### component.11 = test fixtures and acceptance tests

**explicitly requested?** IMPLICIT — tests verify the feature works

**minimum viable?** YES — follows test patterns from research

**abstraction for future flexibility?** NO — standard test fixtures

**feature added "while we're here"?** NO — required for verification

**premature optimization?** NO — necessary for quality

**verdict:** KEEP — required for verification

---

## already YAGNI'd (documented in blueprint)

| component | reason |
|-----------|--------|
| syncAllRoleBootsIntoOneBrainConfig | logic inlined in genBrainConfigDir |
| claudeMd.dao.ts | direct fs.writeFile suffices for plain text |

## r5 update: BrainCliConfigAdapter reversal

**prior r3/r5 verdict said:** "defer genBrainBootsAdapterForClaudeCode until second brain supported"

**r5 re-review verdict:** REVERSED — adapter factory is NOT YAGNI because:

1. **genBrainHooksAdapterForClaudeCode already exists** — this is migration, not new abstraction
2. **opencode brain already exists** — rhachet-brains-opencode has genBrainHooksAdapterForOpencode
3. **user explicitly requested unification** — "deprecate BrainHooksAdapter" requires unified adapter

the pattern is now BrainCliConfigAdapter with daos: { hooks, boots, choice }. this is migration + unification, not premature abstraction.

---

## found issues

### issue.1 = stale YAGNI verdict on adapter factory (r5 update)

**problem:** prior r5 said "defer genBrainBootsAdapterForClaudeCode until second brain" — this was wrong

**analysis:**
- genBrainHooksAdapterForClaudeCode already exists (not new)
- genBrainHooksAdapterForOpencode already exists (second brain)
- user requested unification into BrainCliConfigAdapter

**fix:** reversed YAGNI verdict. adapter factory KEPT as genBrainCliConfigAdapterForClaudeCode.

### issue.2 = stale component references (r5 update)

**problem:** component.1 and component.2 referenced old BrainBootsAdapter pattern

**fix:** updated to reference BrainCliConfigAdapter with daos: { hooks, boots, choice }

---

## holds (non-issues)

### hold.1 = BrainBootsAdapter is explicitly requested

the wish says "use something like a BrainBootsAdapter (rather than the BrainHooksAdapter)". this explicitly requests the BrainBootsAdapter interface — it is NOT optional and NOT YAGNI.

### hold.2 = BrainBootsAdapterDao follows the established pattern

BrainHooksAdapter has a DAO; BrainBootsAdapter mirrors this pattern. the DAO provides the abstraction for CLAUDE.md operations, symmetric to how BrainHooksAdapterDao abstracts hook operations.

### hold.3 = symlink pattern is not over-engineering

symlink vs copy:
- symlink ensures credentials stay in sync if user re-auths
- copy would require re-init after re-auth
- symlink is simpler, not more complex

---

## verdict

**pass** — 11 components reviewed, all are either explicitly requested or minimum-viable derivations. 2 components were pruned (syncAllRoleBootsIntoOneBrainConfig, claudeMd.dao). genBrainBootsAdapterForClaudeCode reversal: now KEPT as genBrainCliConfigAdapterForClaudeCode because it migrates extant adapter, not new abstraction.

---

## session review: 2026-04-23

verified against blueprint YAGNI check:
- 11 components reviewed for YAGNI
- 2 components pruned: syncAllRoleBootsIntoOneBrainConfig, claudeMd.dao
- r5 update reversed stale adapter factory YAGNI (genBrainHooksAdapterForClaudeCode already exists)
- all kept components trace to wish requirements or are minimum-viable derivations
- BrainCliConfigAdapter unification per user feedback: not premature abstraction

**confirmed pass**.

### found issues (2026-04-23)

#### issue.r5.1 = blueprint evolved daos structure

**problem:** blueprint now uses `daos: { boots, hooks, auth, prefs }` and BrainCli.spawn instead of `daos: { hooks, boots, choice }`

**verification:** vision-to-blueprint deviations table documents this evolution with rationale (auth/prefs split for distinct lifecycle)

**status:** NOT A YAGNI CONCERN — documented evolution, not scope creep

---

### additional YAGNI verification (2026-04-23 deep check)

#### verified: new blueprint components vs wish requirements

| blueprint component | wish requirement | minimum viable? | verdict |
|---------------------|------------------|-----------------|---------|
| BrainCliConfigAdapter | wish: "BrainBootsAdapter symmetric to BrainHooksAdapter" | yes — unified adapter reduces complexity | KEEP |
| daos.boots | wish: "briefs and skills get booted into cacheable location" | yes — writes CLAUDE.md | KEEP |
| daos.hooks | extant pattern | yes — migrated from BrainHooksAdapterDao | KEEP |
| daos.auth | wish: "auth is shared across configs" | yes — credentials symlink | KEEP |
| daos.prefs | vision-to-blueprint deviation | yes — settings.json for model prefs | KEEP |
| BrainCli entity | wish: "boots adapters respect rhx enroll pattern" | yes — spawn is domain concern | KEEP |
| BrainCliConfig entity | derived | yes — config artifact needs unique identity | KEEP |
| genBrainCliConfigAdapterForClaudeCode | extant genBrainHooksAdapterForClaudeCode | yes — factory migrated | KEEP |
| genBrainCliForClaudeCode | derived from BrainCli | yes — spawn needs CLI-specific config | KEEP |
| genClaudeMdContent | wish: "briefs get booted" | yes — generates boot content | KEEP |
| getBrainCliConfigAdapterByConfigImplicit | extant getBrainHooksAdapterByConfigImplicit | yes — lookup migrated | KEEP |
| getBrainCliBySlug | derived from BrainCli | yes — spawn needs CLI lookup | KEEP |
| asScopeHash | wish: "different roles booted via --roles" | yes — deterministic scope id | KEEP |

#### verified: no premature abstractions

| pattern | question | answer |
|---------|----------|--------|
| 4 daos instead of 2 | abstraction for future flexibility? | NO — auth/prefs have distinct lifecycle per vision-to-blueprint deviations |
| BrainCli separate from adapter | premature separation? | NO — spawn is domain behavior, not i/o; peer to BrainAtom, BrainRepl |
| genClaudeMdContent separate | over-decomposition? | NO — transformer pattern, isolates brain-specific format logic |

#### verified: no features added "while we're here"

| component | explicitly requested? | note |
|-----------|----------------------|------|
| daos.prefs | vision deviation | documented rationale (model prefs in settings.json) |
| BrainCliConfig entity | derived | required for config artifact identity |
| getBrainCliBySlug | derived | required for spawn lookup |

all "derived" components are minimum-viable derivations, not scope creep.

#### verified: no premature optimizations

| optimization | present? | note |
|--------------|----------|------|
| 1-hour cache TTL | NO | deferred per research — 5-min TTL is current |
| multi-brain parallel spawn | NO | not requested |
| config compression | NO | not requested |

**conclusion:** all blueprint components trace to wish requirements or are minimum-viable derivations. 2 components already pruned in prior r3 review (syncAllRoleBootsIntoOneBrainConfig, claudeMd.dao). no additional YAGNI concerns found.
