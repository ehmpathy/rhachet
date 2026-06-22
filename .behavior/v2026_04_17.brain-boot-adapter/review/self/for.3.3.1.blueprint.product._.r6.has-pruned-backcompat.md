# self-review: has-pruned-backcompat

## stone

3.3.1.blueprint.product

## review round

r6

## check

has-pruned-backcompat

---

## backwards compatibility concerns in blueprint

### concern.1 = assertRegistryBootHooksDeclared removal

**what:** remove validation that checks boot hooks are declared

**backwards compat question:** will removal break repos that rely on this validation?

**wisher requested?** DERIVED — blueprint says "obsolete with CLAUDE.md approach"

**evidence:** with CLAUDE.md, boots are written to config dir, not declared in registry

**verdict:** SAFE TO REMOVE — the feature it validates (boot hooks) is replaced by CLAUDE.md

---

### concern.2 = enrollBrainCli interface change (configPath → configDir)

**what:** parameter renamed from `configPath: string` to `configDir: string`

**backwards compat question:** will callers break?

**wisher requested?** NO explicit backwards compat request

**evidence:** enrollBrainCli is internal API, not published contract

**verdict:** SAFE — internal API, no external callers

---

### concern.3 = genBrainCliConfigArtifact output change (file → directory)

**what:** previously generated a flat file, now generates a directory

**backwards compat question:** will callers expect a file path?

**wisher requested?** NO explicit backwards compat request

**evidence:** 
- genBrainCliConfigArtifact is internal orchestrator
- callers (performEnroll) will be updated in same PR
- no external consumers

**verdict:** SAFE — internal orchestrator, updated atomically

---

### concern.4 = invokeInit --hooks flag behavior change

**what:** --hooks flag now generates config directory instead of just hooks

**backwards compat question:** will users expect old behavior?

**wisher requested?** NO explicit backwards compat request

**evidence:**
- --hooks flag already exists but generates different output
- this is the new behavior the wisher requested
- no migration path needed — new config dir is additive

**verdict:** SAFE — wisher explicitly requested this new behavior

---

### concern.5 = config directory structure is new

**what:** `.agent/.brain/$brain/config/scope=$scope/` is a new path

**backwards compat question:** does this conflict with prior structures?

**wisher requested?** NO explicit backwards compat request

**evidence:**
- prior structure: `.agent/.brain/$brain/hooks/` for hooks
- new structure: `.agent/.brain/$brain/config/scope=$scope/` for config dirs
- paths do not overlap

**verdict:** SAFE — new path, no conflict with prior structures

---

### concern.6 = BrainHooksAdapter deprecation (r6 update)

**what:** BrainHooksAdapter deprecated, replaced by BrainCliConfigAdapter.daos.hooks

**backwards compat question:** will code that imports BrainHooksAdapter break?

**wisher requested?** YES — user explicitly said "deprecate BrainHooksAdapter"

**evidence:**
- BrainHooksAdapter is internal interface (in src/domain.objects/)
- callers (syncOneRoleHooksIntoOneBrainRepl, etc.) will be updated in same PR
- no external npm package publishes BrainHooksAdapter

**verdict:** SAFE — user requested deprecation, internal interface only

---

### concern.7 = getBrainHooksAdapterByConfigImplicit deprecation (r6 update)

**what:** lookup function deprecated, replaced by getBrainCliConfigAdapterByConfigImplicit

**backwards compat question:** will code that imports this break?

**wisher requested?** DERIVED — follows from BrainCliConfigAdapter unification

**evidence:**
- lookup function is internal (in src/domain.operations/config/)
- all callers are internal and will be updated atomically

**verdict:** SAFE — internal function, updated atomically

---

## found issues

none — no unnecessary backwards compatibility concerns. all changes are either:
- internal APIs (not published)
- explicitly requested new behavior
- additive (new paths that don't conflict)
- user-directed deprecations (BrainHooksAdapter)

---

## holds (non-issues)

### hold.1 = no need to preserve old hooks-based boot

the wish explicitly says to move from hooks to CLAUDE.md. backwards compat with the old hooks-based boot is NOT requested. the old approach is replaced, not augmented.

### hold.2 = no need to support both configPath and configDir

enrollBrainCli is internal. we can change the parameter name without backwards compat shim because all callers are in the same codebase and will be updated atomically.

---

## verdict

**pass** — 7 backwards compatibility concerns reviewed (5 original + 2 from r6 update for BrainCliConfigAdapter). all are either internal APIs, explicitly requested changes, additive paths, or user-directed deprecations. no unnecessary backwards compat code needed.

---

## session review: 2026-04-23

verified against blueprint backcompat check:
- 7 backwards compatibility concerns reviewed
- all changes are internal APIs or explicitly requested
- BrainHooksAdapter deprecation: user-directed
- config directory structure: additive, no conflict with prior paths
- no backwards-compat shims needed

**confirmed pass**.

---

### found issues (2026-04-23)

#### issue.r6.1 = blueprint deprecation markers verified

**verification:** checked filediff tree for deprecation markers

| marker | file | status |
|--------|------|--------|
| [-] | BrainHooksAdapter.ts | DEPRECATED per user request |
| [-] | BrainHooksAdapterDao.ts | DEPRECATED — replaced by BrainCliConfigHooksDao |
| [-] | BrainBootsAdapter.ts | DEPRECATED — never existed, vision artifact |
| [-] | BrainBootsAdapterDao.ts | DEPRECATED — never existed, vision artifact |
| [-] | getBrainHooksAdapterByConfigImplicit.ts | DEPRECATED — merged into unified lookup |
| [-] | getBrainBootsAdapterByConfigImplicit.ts | DEPRECATED — never existed |
| [-] | genBrainHooksAdapterForClaudeCode.ts | DEPRECATED — merged into genBrainCliConfigAdapterForClaudeCode |
| [-] | genBrainHooksAdapterForOpencode.ts | DEPRECATED — merged into unified adapter |
| [-] | assertRegistryBootHooksDeclared.ts | REMOVE — obsolete with CLAUDE.md |

**status:** all deprecations are either user-requested or clean replacements. no "just in case" backcompat shims.

#### issue.r6.2 = no re-export shims for deprecated APIs

**verification:** blueprint filediff shows `[~] index.ts — export BrainCliConfigAdapter, deprecate old adapters`

**question:** does "deprecate" here imply re-export with @deprecated tag?

**analysis:**
- BrainHooksAdapter is internal (not in published SDK)
- no external consumers need migration path
- re-export shim would be backwards-compat code that adds maintenance burden

**verdict:** clean removal is correct. no re-export shim needed. blueprint says "deprecate" — this indicates "mark as replaced in codebase", not "keep for backcompat".

#### issue.r6.3 = invokeInit --hooks flag is additive

**verification:** criteria line "rhx init claude --hooks generates config"

**question:** does --hooks break old behavior?

**analysis:**
- old --hooks behavior: generate hooks in settings.json
- new --hooks behavior: generate config dir with CLAUDE.md + settings.json
- the new behavior is a superset (still generates hooks, now also generates boots)

**verdict:** backwards compatible by design. same flag, more output.

---

### additional backcompat verification (2026-04-23)

#### verified: no backwards-compat shims in blueprint

| potential shim | present? | rationale |
|----------------|----------|-----------|
| BrainHooksAdapter re-export | NO | internal API, clean removal |
| configPath → configDir dual support | NO | internal function, atomic update |
| old hooks path fallback | NO | wish says replace, not augment |
| deprecated warnings | NO | internal APIs don't need migration path |

**conclusion:** blueprint contains zero backwards-compat shims. all changes are either clean replacements (for internal APIs) or additive (new paths that don't conflict).

---

### blueprint filediff backcompat cross-check (2026-04-23)

verified each [-] marker in filediff tree against backcompat requirements:

#### contract layer changes

| file | change | backcompat needed? | rationale |
|------|--------|-------------------|-----------|
| invokeInit.ts | [~] add $brain positional | NO | additive — old `rhx init --roles X` still works |
| invokeUpgrade.ts | [~] regenerate config | NO | new behavior — regenerate CLAUDE.md after upgrade |

#### domain.objects layer deprecations

| file | change | backcompat needed? | rationale |
|------|--------|-------------------|-----------|
| BrainHooksAdapter.ts | [-] DEPRECATED | NO | user requested deprecation |
| BrainHooksAdapterDao.ts | [-] DEPRECATED | NO | internal interface |
| index.ts | [~] export new | NO | add new exports, can remove old |

#### domain.operations layer deprecations

| file | change | backcompat needed? | rationale |
|------|--------|-------------------|-----------|
| getBrainHooksAdapterByConfigImplicit.ts | [-] DEPRECATED | NO | internal lookup |
| assertRegistryBootHooksDeclared.ts | [-] REMOVE | NO | obsolete validation |

#### plugin layer deprecations

| file | change | backcompat needed? | rationale |
|------|--------|-------------------|-----------|
| genBrainHooksAdapterForClaudeCode.ts | [-] DEPRECATED | NO | merged into unified factory |
| genBrainHooksAdapterForOpencode.ts | [-] DEPRECATED | NO | merged into unified factory |

**verification result:** 0 of 9 deprecated/removed items need backwards-compat shims. all are internal APIs or user-requested deprecations.

---

### holds (non-issues) for backcompat

#### hold.r6.1 = BrainCliConfigAdapter is new, not renamed

BrainCliConfigAdapter is a new interface that unifies BrainHooksAdapter + BrainBootsAdapter. it is NOT a rename of BrainHooksAdapter. therefore:
- no "renamed export" backcompat needed
- no @deprecated tag on BrainHooksAdapter pointing to BrainCliConfigAdapter
- clean addition + clean removal

#### hold.r6.2 = daos structure change is internal

vision said `daos: { hooks, boots, choice }`. blueprint does `daos: { boots, hooks, auth, prefs }`. this is NOT a backcompat concern because:
- vision is design, not shipped code
- no extant BrainCliConfigAdapter with old daos structure
- the interface is new, so no migration

#### hold.r6.3 = BrainCli entity is new

BrainCli (spawn entity) is new. vision had `daos.choice.cli` for spawn. this is NOT a backcompat concern because:
- no extant daos.choice.cli implementation
- BrainCli is additive, not replacement
