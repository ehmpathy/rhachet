# self-review: has-journey-tests-from-repros (r4)

## repros artifact check

### search for repros artifacts

```bash
glob .behavior/v2026_04_04.fix-keyrack-cross-org-fill/3.2.distill.repros.*.md
```

result: no files found.

### why no repros exist

this behavior route did not include a repros phase because:
1. the bug was reported with a clear reproduction in `0.wish.md`
2. the root cause was identified directly from the wish
3. the fix was straightforward (one line change)
4. no external system reproduction was needed

### artifacts that exist

| artifact | purpose |
|----------|---------|
| 0.wish.md | contains the original reproduction |
| 1.vision.md | defines expected behavior |
| 3.3.1.blueprint.product.v1.i1.md | defines implementation |
| 4.1.roadmap.v1.i1.md | defines phases |
| 5.1.execution.*.md | execution status |

## journey test verification

since no formal repros artifact exists, I verify against the reproduction in `0.wish.md`:

### wish reproduction

from `0.wish.md`:
```
rhx keyrack fill --env prod

🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      ├─ set the key
      │  └─ enter secret for ahbode.prod.USPTO_ODP_API_KEY: ********
      └─ get after set, to verify
         └─ ✗ rhx keyrack get --key USPTO_ODP_API_KEY --env prod
```

the bug: slug on 'enter secret for' shows `ahbode` but key is from `rhight` manifest.

### test coverage of reproduction

`fillKeyrackKeys.integration.test.ts` [case8]:
- creates root keyrack (org: ahbode) with extends to rhight keyrack
- creates extended keyrack (org: rhight) with USPTO_ODP_API_KEY
- calls fillKeyrackKeys with env=prod
- asserts: `slugs.toContain('rhight.prod.USPTO_ODP_API_KEY')`

**why it holds**: the test directly reproduces the bug scenario and verifies the fix.

### BDD structure verification

```ts
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
  when('[t0] fill is called with env=prod', () => {
    then('stores USPTO_ODP_API_KEY under rhight org', async () => {
      // assertions
    });
  });
});
```

**why it holds**: follows BDD given/when/then structure with proper labels.

## conclusion

| check | result |
|-------|--------|
| repros artifact exists? | no (not needed for this fix) |
| wish reproduction covered by test? | yes (case8) |
| test follows BDD structure? | yes |

journey test implemented via case8, which covers the reproduction from wish.
