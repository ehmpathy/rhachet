# review.self: has-consistent-conventions

## question: do names and patterns match extant conventions?

### step 1: compare function names to extant

extant guard functions in manifest/:
- `findNonExecutableSkillFiles`
- `findOrphanBriefMinFiles`
- `assertRegistrySkillsExecutable`
- `assertRegistryBriefsSourcesExist`

new functions:
- `findRolesWithBootableButNoHook` — matches `find*` pattern
- `assertRegistryBootHooksDeclared` — matches `assertRegistry*` pattern

**verdict**: names match extant conventions.

### step 2: compare type names to extant

extant violation types:
- no standalone violation type extant (violations are inline arrays)

new types:
- `BootHookViolationReason` — type union for violation reasons
- `RoleBootHookViolation` — interface for violation record

**question**: should we match extant pattern (inline arrays)?

**verdict**: standalone types are acceptable. they enable better test assertions and error messages. the extant guards could benefit from this pattern too.

### step 3: compare file structure to extant

extant:
```
src/domain.operations/manifest/
  findNonExecutableSkillFiles.ts
  assertRegistrySkillsExecutable.ts
  findOrphanBriefMinFiles.ts
  assertRegistryBriefsSourcesExist.ts
```

new:
```
src/domain.operations/manifest/
  findRolesWithBootableButNoHook.ts
  assertRegistryBootHooksDeclared.ts
```

**verdict**: file structure matches extant pattern.

### step 4: compare test file structure to extant

extant test files:
- collocated `.test.ts` files in same directory

new test files:
- `findRolesWithBootableButNoHook.test.ts`
- `assertRegistryBootHooksDeclared.test.ts`

**verdict**: test file structure matches extant pattern.

### step 5: compare error message style to extant

extant style (from assertRegistrySkillsExecutable):
```
🐢 bummer dude...

🐚 repo introspect
   └─ ✋ non-executable skill files detected
```

new style:
```
🐢 bummer dude...

🐚 repo introspect
   └─ ✋ bootable roles lack boot hooks
```

**verdict**: error message style matches extant pattern.

### conclusion

all names, types, files, and message styles match extant conventions. no divergence detected.

