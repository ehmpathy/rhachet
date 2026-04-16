# review.self: has-consistent-mechanisms (round 3)

## deeper review: search for extant mechanisms

### step 1: search for extant guard patterns

```bash
grep -r "assertRegistry" src/domain.operations/
```

found extant guards:
- `assertRegistrySkillsExecutable.ts`
- `assertRegistryBriefsSourcesExist.ts`

read each file to understand the pattern:

```typescript
// assertRegistrySkillsExecutable.ts
export const assertRegistrySkillsExecutable = (input: { registry: RoleRegistry }): void => {
  const violations = findNonExecutableSkillFiles({ registry: input.registry });
  if (violations.length > 0) {
    throw new BadRequestError(...);
  }
};
```

**pattern confirmed**: finder function + assertion wrapper that throws `BadRequestError`.

### step 2: search for extant hook validation

```bash
grep -r "onBoot" src/
grep -r "hooks" src/domain.operations/
```

found:
- `RoleHookOnBrain` type in domain.objects
- no extant validation of hook contents

**verdict**: no extant mechanism validates hook presence or content. new functionality.

### step 3: search for extant treestruct error formatters

```bash
grep -r "bummer dude" src/
```

found:
- `assertRegistrySkillsExecutable.ts` — uses treestruct format
- `assertRegistryBriefsSourcesExist.ts` — uses treestruct format

both use inline template literals. no shared formatter.

**verdict**: matches extant pattern. inline treestruct in each assertion.

### step 4: compare new mechanisms to extant

| aspect | extant pattern | new implementation |
|--------|---------------|-------------------|
| location | `src/domain.operations/manifest/` | ✓ same |
| name prefix | `find*` for finder, `assert*` for thrower | ✓ same |
| input shape | `{ registry: RoleRegistry }` | ✓ same |
| error type | `BadRequestError` | ✓ same |
| error format | turtle vibes treestruct | ✓ same |

### conclusion

no duplication. all new mechanisms match extant patterns exactly.

