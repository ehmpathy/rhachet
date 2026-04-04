# self-review: has-critical-paths-frictionless (r7)

## the core question

> does every critical user path work without friction?

## step 1: identify critical paths from wish

**source**: `0.wish.md`

the wish describes one critical path:

```
rhachet-roles-rhight on vlad/feat-patenter
> rhx keyrack fill --env prod
```

with this setup:
- root keyrack org=`ahbode`
- extended keyrack org=`rhight`
- key `USPTO_ODP_API_KEY` declared in extended keyrack

the user expects: enter secret for `rhight.prod.USPTO_ODP_API_KEY`, verify under same slug.

## step 2: verify critical path works

**test file**: `fillKeyrackKeys.integration.test.ts`

**test case**: `[case8] cross-org extends (root=ahbode, extended=rhight)`

**execution**:

```bash
npm run test:integration -- fillKeyrackKeys.integration.test.ts
```

**result**: all 8 tests pass, case8 included.

**assertions verified** (lines 738-741):

```ts
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```

this confirms:
1. USPTO_ODP_API_KEY stored under `rhight` (from extended keyrack), not `ahbode` (root)
2. DB_PASSWORD stored under `ahbode` (from root keyrack)

the fix works as intended.

## step 3: verify no friction introduced in other paths

the fill command has other critical paths that must remain frictionless:

| case | scenario | status |
|------|----------|--------|
| case1 | --help output | pass |
| case2 | absent --env | pass |
| case3 | no keyrack.yml | pass |
| case4 | no keys for env | pass |
| case5 | nonexistent --key | pass |
| case6 | env=all fallback | pass |
| case7 | refresh mode | pass |
| case8 | cross-org extends | pass |

all 8 integration test cases pass. no regression introduced.

## step 4: trace the fix through the critical path

**before fix** (line 258):

```ts
org: repoManifest.org  // always uses root org
```

user action: enter secret for `ahbode.prod.USPTO_ODP_API_KEY`
verify action: get `rhight.prod.USPTO_ODP_API_KEY`
result: mismatch, friction (the bug)

**after fix** (line 258):

```ts
org: asKeyrackKeyOrg({ slug })  // respects slug's org
```

user action: enter secret for `rhight.prod.USPTO_ODP_API_KEY`
verify action: get `rhight.prod.USPTO_ODP_API_KEY`
result: match, no friction (the fix)

## step 5: verify no new friction introduced

the fix adds one new operation: `asKeyrackKeyOrg({ slug })`.

**friction analysis**:

| aspect | assessment |
|--------|------------|
| performance | O(1) string split, negligible |
| error modes | none (slug always has org segment) |
| user-visible | no change except correct org in prompt |
| breaking changes | none (fix aligns behavior with expectation) |

no new friction introduced.

## conclusion

| check | result |
|-------|--------|
| critical path from wish works? | yes (case8 passes) |
| other paths remain frictionless? | yes (cases 1-7 pass) |
| fix introduces new friction? | no |
| user-visible behavior correct? | yes (prompt shows correct org) |

the critical path `rhx keyrack fill --env prod` with cross-org extends now works without friction. the slug shown at prompt matches the slug used for storage and verification.
