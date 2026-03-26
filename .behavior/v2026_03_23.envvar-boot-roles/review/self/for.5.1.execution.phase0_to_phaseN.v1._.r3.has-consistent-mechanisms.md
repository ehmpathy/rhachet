# review: has-consistent-mechanisms

## the question

mechanisms asks: did we create new mechanisms that duplicate extant functionality?

## files reviewed

- `src/contract/cli/invokeEnroll.ts` — CLI command
- `src/domain.operations/enroll/enrollBrainCli.ts` — spawn logic
- `src/domain.operations/enroll/genBrainCliConfigArtifact.ts` — config generation
- `src/domain.operations/enroll/computeBrainCliEnrollment.ts` — role computation
- `src/domain.operations/enroll/parseBrainCliEnrollmentSpec.ts` — spec parse

## extant mechanisms search

searched for related codepaths:
- `grep -r "getLinkedRoles" src/` — found extant role discovery
- `grep -r "settings.json" src/` — found extant settings read
- `grep -r "spawn" src/` — found extant child process patterns
- `grep -r "levenshtein" src/` — found fastest-levenshtein dependency

## deep review

### role discovery

**getLinkedRoleSlugs** — scans `.agent/repo=*/role=*/` directories.

location: `src/contract/cli/invokeEnroll.ts:41-74`

extant mechanism: `src/domain.operations/brains/getLinkedRolesWithHooks.ts`

| aspect | getLinkedRolesWithHooks | getLinkedRoleSlugs |
|--------|------------------------|-------------------|
| context | requires ContextCli | none (filesystem only) |
| imports | dynamic npm imports | none |
| returns | full Role objects | string slugs only |
| filter | roles with hooks.onBrain | all roles |
| lines | 109 lines | 33 lines |

- question: does this duplicate extant role discovery?
- analysis: partially similar directory scan, but fundamentally different concerns:
  1. extant requires `ContextCli` with gitroot — we have no context
  2. extant does `await import(packageName)` — we do no npm resolution
  3. extant returns `HasRepo<Role>[]` — we need `string[]` for spec validation
  4. extant filters to `hooks.onBrain` — we need ALL roles for default computation
- decision: not a duplicate — we have a narrower need (slugs only, no imports, no context)
- why it holds: `invokeEnroll` is a filesystem-only command. to use `getLinkedRolesWithHooks` would require context creation, package resolution, and hook filter — all unnecessary for slug discovery.

### settings.json read

**settings.json read** — reads extant settings to discover hooks.

location: `src/domain.operations/enroll/genBrainCliConfigArtifact.ts:30-40`

- question: does this duplicate extant settings read?
- analysis: no. the extant `genBrainHooksAdapterForClaudeCode` in `src/domain.operations/roles/` writes hooks but doesn't filter by roles. we need to read-then-filter-then-write.
- decision: not a duplicate — different concern (filter by enrolled roles vs write all hooks).
- why it holds: the filter logic is new behavior for this feature.

### child process spawn

**spawn with inherited stdio** — spawns brain CLI.

location: `src/domain.operations/enroll/enrollBrainCli.ts:28-32`

- question: does this duplicate extant spawn patterns?
- analysis: no. checked `src/domain.operations/invoke/` and found no similar spawn-and-replace pattern. extant invokes use different mechanisms.
- decision: not a duplicate — new spawn pattern for brain enrollment.
- why it holds: `enrollBrainCli` replaces the process (`process.exit` on child close), which is unique to this command.

### levenshtein suggestions

**fastest-levenshtein** — used for typo suggestions.

location: `src/domain.operations/enroll/computeBrainCliEnrollment.ts:50`

- question: does this duplicate extant suggestion logic?
- analysis: no. `fastest-levenshtein` is an extant dependency (in package.json). we reuse it, not duplicate.
- decision: reused extant dependency.
- why it holds: we import and call the extant package.

### commander options

**allowUnknownOption** — passes unknown args to brain.

location: `src/contract/cli/invokeEnroll.ts:187-188`

- question: does this duplicate extant commander patterns?
- analysis: checked `src/contract/cli/invokeRun.ts` — also uses `allowUnknownOption`. consistent with extant pattern.
- decision: reused extant pattern.
- why it holds: same pattern as `invokeRun`.

## conclusion

no new mechanisms that duplicate extant functionality.

| mechanism | status |
|-----------|--------|
| getLinkedRoleSlugs | narrower need than extant, justified |
| settings read | different concern (filter vs write) |
| spawn pattern | new for this command |
| levenshtein | reused extant dependency |
| allowUnknownOption | reused extant pattern |

