# self-review: has-questioned-deletables

## stone

3.3.1.blueprint.product

## review round

r3

## check

has-questioned-deletables

---

## features review

### feature: BrainCliConfigAdapter interface (r3 update)

**traceability:** wish requested "BrainBootsAdapter symmetric to BrainHooksAdapter". user feedback elevated this to unified BrainCliConfigAdapter that deprecates BrainHooksAdapter.

**can delete?** no — unified adapter required because:
1. must deprecate BrainHooksAdapter (per user feedback)
2. must unify hooks + boots + choice daos
3. daos.choice provides CLI invocation config (command, env var, args)

**verdict:** keep — BrainCliConfigAdapter with daos: { hooks, boots, choice }

---

### feature: BrainHooksDao (migrated from BrainHooksAdapterDao)

**traceability:** extant pattern, now under BrainCliConfigAdapter.daos.hooks

**can delete?** no — hooks functionality must be preserved

**verdict:** keep — migrate extant logic, no new abstraction

---

### feature: BrainBootsDao

**traceability:** wish requested boot content generation

**can delete?** question: is DAO abstraction needed?

**analysis:**
- BrainBootsDao only needs: get(configDir), set(configDir, roles, repoPath)
- simple get/set interface, minimal

**verdict:** keep — already minimal

---

### feature: syncAllRoleBootsIntoOneBrainConfig

**traceability:** derived from syncOneRoleHooksIntoOneBrainRepl pattern

**can delete?** question: is this a separate operation or can it be inlined?

**analysis:**
- genBrainConfigDir already calls genClaudeMdContent
- genClaudeMdContent captures bootRoleResources output
- no separate "sync" step is needed — it's just generate-and-write

**verdict:** DELETE — redundant. genBrainConfigDir already does this inline.

**fix:** removed from filediff tree and codepath tree

---

### feature: claudeMd.dao

**traceability:** follows pattern from hooks/config.dao

**can delete?** question: is DAO wrapper needed or can we just use fs.readFile/writeFile?

**analysis:**
- hooks config.dao handles JSON parse/stringify, default values
- CLAUDE.md is plain text, no parse needed
- direct fs operations suffice

**verdict:** DELETE — over-abstraction. use fs.writeFile directly in genBrainConfigDir.

**fix:** removed from filediff tree

---

### feature: genBrainCliConfigAdapterForClaudeCode (r3 update)

**traceability:** unified adapter factory that replaces both genBrainHooksAdapterForClaudeCode and genBrainBootsAdapterForClaudeCode

**can delete?** no — required because:
1. genBrainHooksAdapterForClaudeCode already exists and is in use
2. we're unifying into BrainCliConfigAdapter, not adding new abstraction
3. opencode brain also needs adapter (rhachet-brains-opencode exists)

**verdict:** keep — this is migration + unification, not YAGNI

---

### feature: boot order section

**traceability:** wish says "order the repo=.this/role=any boots AFTER the published role boots"

**can delete?** no — explicitly requested

**verdict:** keep

---

### feature: .gitignore for scoped configs

**traceability:** criteria says "scoped config dir has .gitignore"

**can delete?** no — in criteria

**verdict:** keep

---

### feature: .credentials.json symlink

**traceability:** criteria says "sothat auth is shared across configs"

**can delete?** no — in criteria

**verdict:** keep

---

### feature: BrainChoiceDao (r3 thorough review)

**traceability:** user asked "who's going to tell enroll how to invoke the CLI?"

**can delete?** question: is daos.choice necessary or over-engineering?

**thorough analysis:**
1. **if we delete choice and just hardcode CLI invocation in enrollBrainCli:**
   - enrollBrainCli already has lookupBrainCommand and lookupBrainConfigEnv
   - these would remain hardcoded lookup tables
   - adding new brain (e.g., cursor) requires editing enrollBrainCli.ts
   
2. **if we keep choice:**
   - CLI invocation config lives in adapter alongside hooks and boots
   - adding new brain just means new adapter factory
   - no changes to core code

**verdict:** keep — proper abstraction, not over-engineering

---

### feature: getBrainCliConfigAdapterByConfigImplicit.ts (r3 thorough review)

**traceability:** lookup function that returns adapter for brain slug

**can delete?** question: can callers construct adapter directly?

**thorough analysis:**
1. **callers (invokeInit, invokeEnroll, etc.) don't know which plugin provides which brain**
2. **lookup function abstracts plugin registration**
3. **same pattern as extant getBrainHooksAdapterByConfigImplicit**
4. **if deleted, callers would need direct imports from plugin packages**

**verdict:** keep — follows extant pattern, proper abstraction

---

### feature: genBrainCliConfigAdapterForOpencode.ts (r3 thorough review)

**traceability:** blueprint shows opencode adapter factory

**can delete?** question: does opencode need boots and choice daos?

**thorough analysis:**
1. **genBrainHooksAdapterForOpencode already exists** — opencode brain is supported
2. **unified adapter requires migrating hooks dao**
3. **opencode may have different CLI invocation (daos.choice)**
4. **boots may not be applicable to opencode (no OPENCODE.md equivalent)**

**verdict:** keep for hooks migration, but flag: opencode may not support all daos

**note for implementation:** opencode daos.boots and daos.choice may return null/noop if not applicable

---

## components simplified (r3 update)

| component | r3 original proposal | r3 re-review decision | rationale |
|-----------|---------------------|----------------------|-----------|
| domain.objects | BrainBootsAdapter, BrainBootsAdapterDao | BrainCliConfigAdapter with daos: { hooks, boots, choice } | unified adapter per user feedback |
| domain.operations | syncAllRoleBootsIntoOneBrainConfig | DELETE — inline in adapter.daos.boots.set | redundant orchestrator |
| rhachet-brains-anthropic | claudeMd.dao standalone | DELETE — inline in daos.boots.set | over-abstraction |
| rhachet-brains-anthropic | genBrainBootsAdapterForClaudeCode | KEEP as genBrainCliConfigAdapterForClaudeCode | migrates extant genBrainHooksAdapterForClaudeCode |
| domain.objects | BrainHooksAdapter, BrainHooksAdapterDao | DEPRECATE — migrate to BrainCliConfigAdapter.daos.hooks | unification per user feedback |

**key insight from r3 re-review:** the original r3 verdict incorrectly flagged genBrainBootsAdapterForClaudeCode as YAGNI because it only considered boots in isolation. when we consider the full picture (hooks adapter already exists, opencode brain exists, user requested unification), the adapter pattern is justified.

---

## found issues

### issue.1 = syncAllRoleBootsIntoOneBrainConfig is redundant

**problem:** proposed separate orchestrator that duplicates logic already in genBrainConfigDir

**fix:** removed from blueprint. genBrainConfigDir calls adapter.daos.boots.set directly.

### issue.2 = claudeMd.dao is over-abstraction

**problem:** DAO wrapper for plain text file adds no value

**fix:** removed standalone dao. boot logic now in adapter.daos.boots.set which handles genClaudeMdContent + fs.writeFile together.

### issue.3 = prior verdict "genBrainBootsAdapterForClaudeCode is YAGNI" was wrong (r3 update)

**problem:** r3 originally said delete adapter factory because "only one brain supported"

**analysis on r3 re-review:**
- genBrainHooksAdapterForClaudeCode already exists (not new)
- opencode brain also exists (rhachet-brains-opencode)
- user requested unified BrainCliConfigAdapter that deprecates BrainHooksAdapter
- this is migration + unification, not premature abstraction

**fix:** reversed decision. keep genBrainCliConfigAdapterForClaudeCode as unified adapter factory.

---

## verdict

**pass after fixes** — reviewed each component for deletability:
- syncAllRoleBootsIntoOneBrainConfig: deleted (redundant)
- claudeMd.dao: inlined into adapter.daos.boots.set
- BrainCliConfigAdapter: keep (unifies extant adapters, not YAGNI)
- genBrainCliConfigAdapterForClaudeCode: keep (migrates extant logic)

---

## session review: 2026-04-23

verified against current blueprint (3.3.1.blueprint.product.yield.md):

### blueprint-to-review alignment check

blueprint now specifies:
- `daos: { boots, hooks, auth, prefs }` (not `{ hooks, boots, choice }`)
- BrainCli entity with spawn() (not daos.choice.cli)
- vision-to-blueprint deviations documented

review r3 findings remain valid because:
- syncAllRoleBootsIntoOneBrainConfig still deleted (redundant)
- claudeMd.dao still inlined (over-abstraction)
- BrainCliConfigAdapter still unifies adapters (not YAGNI)
- genBrainCliConfigAdapterForClaudeCode still migrates extant

### additional verification (2026-04-23)

- filediff tree verified: BrainCliConfigAdapter.ts with daos property present
- codepath tree verified: genBrainConfigDir orchestrates boot content write
- boot order verified: published roles before local roles
- 12 features traced to wish/criteria requirements

**confirmed pass**.
