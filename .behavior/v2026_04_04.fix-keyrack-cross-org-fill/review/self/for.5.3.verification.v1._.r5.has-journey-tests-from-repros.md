# self-review: has-journey-tests-from-repros (r5)

## repros artifact status

no `3.2.distill.repros.*.md` files exist for this behavior.

**why**: the wish itself contains the reproduction. see `0.wish.md` lines 1-55.

## wish-to-test map

the guide says to verify journey tests from repros. since no formal repros exist, I map the wish reproduction to the test case.

### wish reproduction (0.wish.md)

**scenario** (lines 3-4):
```
rhachet-roles-rhight on vlad/feat-patenter
➜ rhx keyrack fill --env prod
```
→ repo extends rhight keyrack, user calls fill with env=prod

**bug symptom** (lines 8-18):
```
🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      ├─ set the key
      │  └─ enter secret for ahbode.prod.USPTO_ODP_API_KEY: ********
      └─ get after set, to verify
         └─ ✗ rhx keyrack get --key USPTO_ODP_API_KEY --env prod
```
→ slug shows `ahbode.prod` but key is from `rhight` keyrack

**error** (lines 20-26):
```
⛈️ BadRequestError: roundtrip verification failed
{
  "slug": "rhight.prod.USPTO_ODP_API_KEY",
  "owner": "default",
  "status": "absent"
}
```
→ get looks for `rhight.prod` but set stored under `ahbode.prod`

**root cause** (lines 39-41):
```
the root keyrack is for org `ahbode`
but the nested, extended keyrack is for org `rhight`
```

### test case8 map

| wish element | test case8 equivalent |
|--------------|----------------------|
| repo extends rhight keyrack | lines 663-686: creates root (ahbode) + extended (rhight) |
| fill --env prod | line 717: `fillKeyrackKeys({ env: 'prod', ... })` |
| USPTO_ODP_API_KEY | lines 668-670: `env.prod: - USPTO_ODP_API_KEY` |
| org: ahbode (root) | line 679: `org: ahbode` |
| org: rhight (extended) | line 668: `org: rhight` |
| expected: stored under rhight | line 738: `expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY')` |

### line-by-line test verification

**line 659**: given block
```ts
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
```
→ matches wish scenario: root=ahbode, extended=rhight

**lines 663-686**: setup
```ts
// create extended keyrack (org: rhight)
writeFileSync(join(roleDir, 'keyrack.yml'), `org: rhight\nenv.prod:\n  - USPTO_ODP_API_KEY\n`);

// create root keyrack (org: ahbode, extends rhight)
writeFileSync(join(root, '.agent', 'keyrack.yml'), `org: ahbode\nextends:\n  - .agent/repo=rhight/role=patenter/keyrack.yml\n`);
```
→ matches wish: root org=ahbode extends rhight which has USPTO_ODP_API_KEY

**line 712**: when block
```ts
when('[t0] fill is called with env=prod', () => {
```
→ matches wish: `rhx keyrack fill --env prod`

**lines 738-741**: assertions
```ts
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```
→ verifies fix: USPTO_ODP_API_KEY stored under rhight (not ahbode)

## BDD structure check

| element | present | line |
|---------|---------|------|
| describe | yes | 64 |
| given('[case8]...') | yes | 659 |
| when('[t0]...') | yes | 712 |
| then('...') | yes | 713 |

**why it holds**: proper BDD structure with case and t0 labels.

## conclusion

the wish reproduction (0.wish.md) is fully covered by case8:
- same scenario: cross-org extends
- same action: fill --env prod
- same assertion: key stored under correct org (rhight, not ahbode)

no formal repros artifact was needed — wish contained sufficient reproduction detail.
