# self-review: has-critical-paths-frictionless (r8)

## the core question

> does every critical path work without friction?

## step 1: locate repros artifact

**search**: `.behavior/v2026_04_04.fix-keyrack-cross-org-fill/3.2.distill.repros*.md`

**result**: no repros artifact exists.

**why**: the wish (`0.wish.md`) contains the reproduction directly. lines 1-55 describe the exact scenario and symptom.

## step 2: extract critical path from wish

**source**: `0.wish.md` lines 3-26

**scenario**:
```
rhachet-roles-rhight on vlad/feat-patenter
> rhx keyrack fill --env prod
```

**setup**:
- root keyrack: org=`ahbode`
- extended keyrack: org=`rhight` (via extends directive)
- key `USPTO_ODP_API_KEY` declared in extended keyrack

**symptom (before fix)**:
```
enter secret for ahbode.prod.USPTO_ODP_API_KEY: ********
...
✗ rhx keyrack get --key USPTO_ODP_API_KEY --env prod

⛈️ roundtrip verification failed
{
  "slug": "rhight.prod.USPTO_ODP_API_KEY",
  "status": "absent"
}
```

the slug at prompt (`ahbode.prod`) differs from the slug at verify (`rhight.prod`).

**expected (after fix)**:
```
enter secret for rhight.prod.USPTO_ODP_API_KEY: ********
...
✓ rhx keyrack get --key USPTO_ODP_API_KEY --env prod
```

prompt and verify use the same slug.

## step 3: trace through the code fix

**file**: `fillKeyrackKeys.ts`

**fix location**: line 258

**before**:
```ts
org: repoManifest.org  // always uses root org
```

**after**:
```ts
org: asKeyrackKeyOrg({ slug })  // extracts org from slug
```

**asKeyrackKeyOrg implementation** (`asKeyrackKeyOrg.ts` lines 5-10):
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

**trace for USPTO_ODP_API_KEY**:
1. slug = `rhight.prod.USPTO_ODP_API_KEY` (from extended manifest hydration)
2. `asKeyrackKeyOrg({ slug })` returns `rhight`
3. `setKeyrackKey` receives `org: 'rhight'`
4. key stored under `rhight.prod.USPTO_ODP_API_KEY`
5. verify looks up `rhight.prod.USPTO_ODP_API_KEY`
6. roundtrip succeeds

**trace for DB_PASSWORD** (root manifest key):
1. slug = `ahbode.prod.DB_PASSWORD` (from root manifest hydration)
2. `asKeyrackKeyOrg({ slug })` returns `ahbode`
3. `setKeyrackKey` receives `org: 'ahbode'`
4. key stored under `ahbode.prod.DB_PASSWORD`
5. verify looks up `ahbode.prod.DB_PASSWORD`
6. roundtrip succeeds

## step 4: verify via integration test

**file**: `fillKeyrackKeys.integration.test.ts`

**test case**: `[case8] cross-org extends (root=ahbode, extended=rhight)`

**setup** (lines 663-686):
```ts
// extended keyrack (org: rhight)
writeFileSync(join(roleDir, 'keyrack.yml'), `org: rhight
env.prod:
  - USPTO_ODP_API_KEY
`);

// root keyrack (org: ahbode, extends rhight)
writeFileSync(join(root, '.agent', 'keyrack.yml'), `org: ahbode
extends:
  - .agent/repo=rhight/role=patenter/keyrack.yml
env.prod:
  - DB_PASSWORD
`);
```

**assertions** (lines 738-741):
```ts
// USPTO_ODP_API_KEY from extended manifest should be under rhight org
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');

// DB_PASSWORD from root manifest should be under ahbode org
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```

**test result**: pass

**what the assertions prove**:
1. USPTO_ODP_API_KEY stored under `rhight` (its declared org), not `ahbode` (root org)
2. DB_PASSWORD stored under `ahbode` (its declared org)
3. both keys set without error (`result.summary.set === 2`, `result.summary.failed === 0`)
4. roundtrip verification passed for both (no error thrown)

## step 5: verify no friction in behavior

**friction checklist**:

| aspect | before fix | after fix |
|--------|-----------|-----------|
| prompt slug | `ahbode.prod.USPTO_KEY` (wrong) | `rhight.prod.USPTO_KEY` (correct) |
| store slug | `ahbode.prod.USPTO_KEY` | `rhight.prod.USPTO_KEY` |
| verify slug | `rhight.prod.USPTO_KEY` | `rhight.prod.USPTO_KEY` |
| roundtrip | fail (mismatch) | pass (match) |
| user action | confused, retries, fails | smooth, works first time |

**before fix**: user enters secret, fill says absent. user confused. friction.

**after fix**: user enters secret, fill verifies success. no confusion. frictionless.

## step 6: verify other paths remain frictionless

**all 8 integration test cases pass**:

| case | scenario | pass |
|------|----------|------|
| case1 | basic fill with single key | yes |
| case2 | fill with multiple keys | yes |
| case3 | fill with env=all fallback | yes |
| case4 | fill with specific --key | yes |
| case5 | fill with --refresh | yes |
| case6 | fill with --repair | yes |
| case7 | fill with multiple owners | yes |
| case8 | cross-org extends | yes |

no regression. all paths frictionless.

## conclusion

| check | result | evidence |
|-------|--------|----------|
| critical path from wish works? | yes | case8 passes with correct slugs |
| prompt shows correct org? | yes | `asKeyrackKeyOrg({ slug })` extracts from slug |
| roundtrip verification passes? | yes | `result.summary.failed === 0` |
| other paths remain frictionless? | yes | cases 1-7 pass |
| fix introduces friction? | no | single O(1) string split, no new errors |

the critical path `rhx keyrack fill --env prod` with cross-org extends now works without friction. the fix aligns prompt, store, and verify to use the same org from the slug.
