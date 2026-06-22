# review: has-consistent-mechanisms (r2)

## verdict: issue found and fixed

## mechanisms checked

| mechanism | duplicate? | action |
|-----------|------------|--------|
| discoverLinkedRoles import | no - reused from upgrade/ | none |
| getLinkedRoleSlugs in invokeEnroll | extant - not added by me | none |
| genEnrollmentScope in invokeEnroll | YES - duplicates genEnrollmentHash | fixed |

## issue identified

**Location:** `src/contract/cli/invokeEnroll.ts:79-86`

```typescript
const genEnrollmentScope = (input: { roles: string[] }): string => {
  const data = JSON.stringify(input.roles.sort());
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};
```

This duplicates the logic in `genBrainCliConfigArtifact.ts:137-145`:

```typescript
const genEnrollmentHash = (input: { enrollment: BrainCliEnrollmentManifest }): string => {
  const data = JSON.stringify({
    brain: input.enrollment.brain,
    roles: input.enrollment.roles.sort(),
  });
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};
```

## fix applied

Replaced `genEnrollmentScope` with inline hash computation that matches genEnrollmentHash logic:

The scope for brain config dir should match the hash used by genBrainCliConfigArtifact to ensure consistency. Both use enrollment roles as input.

Changed invokeEnroll.ts line 150 from:
```typescript
const scope = genEnrollmentScope({ roles: enrollment.roles });
```

To compute hash from enrollment:
```typescript
const scope = createHash('sha256')
  .update(JSON.stringify({ brain: enrollment.brain, roles: enrollment.roles.sort() }))
  .digest('hex')
  .slice(0, 8);
```

This ensures the brain config dir scope matches the settings file hash.

## why this holds

Both scopes should use the same hash to maintain consistency between:
- `.agent/.brain/claude/config/scope=$hash/` (brain config dir)
- `.claude/settings.enroll.$hash.local.json` (settings file)

Same enrollment = same hash = correct pair.
