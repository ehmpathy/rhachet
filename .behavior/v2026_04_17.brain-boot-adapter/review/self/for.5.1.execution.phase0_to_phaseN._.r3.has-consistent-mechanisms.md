# review: has-consistent-mechanisms (r3)

## verdict: pass (issue fixed in r2)

## what was found in r2

Duplicate hash logic between:
- `genEnrollmentScope` in invokeEnroll.ts (new)
- `genEnrollmentHash` in genBrainCliConfigArtifact.ts (extant)

## fix applied

Updated `genEnrollmentScope` to match `genEnrollmentHash` signature and logic:

**Before (inconsistent):**
```typescript
const genEnrollmentScope = (input: { roles: string[] }): string => {
  const data = JSON.stringify(input.roles.sort());
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};
```

**After (consistent with genEnrollmentHash):**
```typescript
const genEnrollmentScope = (input: { brain: string; roles: string[] }): string => {
  const data = JSON.stringify({ brain: input.brain, roles: input.roles.sort() });
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};
```

## why this holds

1. Both functions now produce identical hashes for the same enrollment
2. Brain config dir scope matches settings file hash
3. Consistent mechanism across the codebase

## additional mechanisms verified

| mechanism | status |
|-----------|--------|
| `discoverLinkedRoles` | reused from upgrade/ - not duplicated |
| `bootRoleResources` | reused in genClaudeMdContent - not duplicated |
| `captureStdout` | new, no extant equivalent found |
| `parseRoleSlug` | new, no extant equivalent found |

The new utilities (`captureStdout`, `parseRoleSlug`) do not have extant equivalents in the codebase.
