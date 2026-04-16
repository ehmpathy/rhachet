# review.self: has-consistent-mechanisms

## question: do new mechanisms duplicate extant functionality?

### search for related codepaths

searched for extant guards in `invokeRepoIntrospect.ts`:

```typescript
// extant guards in invokeRepoIntrospect
assertRegistrySkillsExecutable({ registry });
assertRegistryBriefsSourcesExist({ registry });
assertRegistryBootHooksDeclared({ registry });  // new
```

all follow the same pattern:
- `assert*` prefix
- takes `{ registry: RoleRegistry }` input
- throws `BadRequestError` on violation
- lives in `src/domain.operations/manifest/`

### check: does `findRolesWithBootableButNoHook` duplicate extant functionality?

searched for extant role validation utilities:
- `assertRegistrySkillsExecutable.ts` — validates skill executability
- `assertRegistryBriefsSourcesExist.ts` — validates brief sources
- `findOrphanBriefMinFiles.ts` — finds orphan .md.min files
- `findNonExecutableSkillFiles.ts` — finds non-executable skills

**verdict**: no duplication. this is a new validation type (boot hook presence). no extant mechanism validates hooks.

### check: does the transformer duplicate the assertion?

the separation follows extant pattern:
- `findNonExecutableSkillFiles.ts` (finder) + `assertRegistrySkillsExecutable.ts` (thrower)
- `findOrphanBriefMinFiles.ts` (finder) + `assertRegistryBriefsSourcesExist.ts` (thrower)
- `findRolesWithBootableButNoHook.ts` (finder) + `assertRegistryBootHooksDeclared.ts` (thrower)

**verdict**: consistent with extant patterns. finder/asserter separation is intentional.

### check: does the regex duplicate extant parse logic?

searched for extant hook command parse logic:
- no extant code parses `onBoot` hook commands
- this is a new validation requirement

**verdict**: no duplication. hook command parse is new.

### overall

no mechanisms duplicate extant functionality. implementation follows extant patterns for guards.

