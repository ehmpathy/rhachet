# self-review: role-standards-coverage (r8)

## briefs directories for coverage check

| category | directory | patterns to verify |
|----------|-----------|-------------------|
| procedures | evolvable.procedures | arrow-only, input-context, single-responsibility |
| comments | readable.comments | what-why headers |
| errors | pitofsuccess.errors | fail-fast, helpful-error |
| types | pitofsuccess.typedefs | explicit types, no as-cast |
| tests | frames.behavior | given-when-then, useBeforeAll |
| names | lang.terms | treestruct, noun-adj order |

## file 1: asKeyrackKeyOrg.ts — line by line

### line 1-4: jsdoc block
```ts
/**
 * .what = extract org from env-scoped slug
 * .why = fill needs org to store keys under correct org
 */
```
**check: rule.require.what-why-headers**
- `.what` present: yes
- `.why` present: yes
- format matches extant: yes (see asKeyrackKeyEnv.ts lines 1-4)
**covered**

### line 5: function signature
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
```
**check: rule.require.arrow-only**
- uses `=>` syntax: yes
- no `function` keyword: yes
**covered**

**check: rule.require.input-context-pattern**
- input as first arg: yes
- input is object: yes
- no context needed (pure): correct
**covered**

**check: rule.require.shapefit (types)**
- input type explicit: `{ slug: string }`
- return type explicit: `: string`
**covered**

### lines 6-7: comments
```ts
  // slug format: $org.$env.$key
  // split on dot, take first part
```
**check: rule.require.what-why-headers (code paragraphs)**
- explains slug format: yes
- explains extraction logic: yes
- matches extant (asKeyrackKeyEnv.ts lines 6-7): yes
**covered**

### lines 8-9: implementation
```ts
  const parts = input.slug.split('.');
  return parts[0] ?? '';
```
**check: rule.require.immutable-vars**
- uses `const`: yes
- no mutation: yes
**covered**

**check: pitofsuccess.errors (safe fallback)**
- question: should this throw on invalid input?
- analysis: extant `asKeyrackKeyEnv` uses same `?? ''` fallback
- empty result handled by callers who validate slugs upstream
- pattern is consistent with peer extractors
**covered** (safe fallback matches extant)

### absent patterns check
| pattern | expected | present |
|---------|----------|---------|
| jsdoc | yes | yes |
| arrow function | yes | yes |
| input object | yes | yes |
| explicit types | yes | yes |
| immutable vars | yes | yes |
| safe fallback | yes | yes |
**no gaps**

## file 2: asKeyrackKeyOrg.test.ts — line by line

### lines 1-3: imports
```ts
import { given, then, when } from 'test-fns';
import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';
```
**check: test imports**
- uses test-fns: yes
- imports subject under test: yes
**covered**

### lines 5-16: case1
```ts
describe('asKeyrackKeyOrg', () => {
  given('[case1] a standard slug', () => {
    when('[t0] org is extracted', () => {
      then('returns the org segment', () => {
        expect(asKeyrackKeyOrg({ slug: 'rhight.prod.USPTO_KEY' })).toEqual('rhight');
        expect(asKeyrackKeyOrg({ slug: 'ahbode.test.AWS_PROFILE' })).toEqual('ahbode');
      });
    });
  });
```
**check: rule.require.given-when-then**
- uses `given`: yes
- uses `when`: yes
- uses `then`: yes
- labels: `[case1]`, `[t0]` present
**covered**

**check: assertions**
- tests multiple orgs: yes (rhight, ahbode)
- tests multiple envs: yes (prod, test)
**covered**

### lines 19-27: case2
```ts
  given('[case2] a slug with dots in key name', () => {
    when('[t0] org is extracted', () => {
      then('returns only the first segment', () => {
        expect(asKeyrackKeyOrg({ slug: 'ehmpathy.prod.API.KEY.V2' })).toEqual('ehmpathy');
      });
    });
  });
```
**check: edge case coverage**
- tests key with dots: yes
- verifies only first segment returned: yes
**covered**

### absent patterns check
| pattern | expected | present |
|---------|----------|---------|
| given/when/then | yes | yes |
| case labels | yes | yes |
| standard case | yes | yes |
| edge case | yes | yes |
**no gaps**

## file 3: fillKeyrackKeys.ts — change review

### line 9: import
```ts
+import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';
```
**check: import organization**
- grouped with peer imports (asKeyrackKeyName): yes
- alphabetical within group: yes (after asKeyrackKeyName)
**covered**

### line 258: the fix
```ts
-            org: repoManifest.org,
+            org: asKeyrackKeyOrg({ slug }),
```
**check: extant pattern**
- matches asKeyrackKeyName call at line 163: `asKeyrackKeyName({ slug })`
- uses input object pattern: yes
- no mutation: yes
**covered**

**check: correctness**
- `slug` variable defined at line 166: `const slug = key;`
- `key` comes from `repoManifest.keys` iteration
- keys already have correct org from manifest hydration
**covered**

## file 4: fillKeyrackKeys.integration.test.ts [case8]

### lines 658-660: given block
```ts
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
```
**check: rule.require.given-when-then**
- `given` present: yes
- label `[case8]` follows extant pattern (case1-7): yes
**covered**

### lines 659-691: useBeforeAll setup
```ts
const repo = useBeforeAll(async () => {
  // creates directory structure
  // writes extended keyrack.yml with org: rhight
  // writes root keyrack.yml with org: ahbode and extends
});

const manifest = useBeforeAll(async () => {
  // creates host manifest for owner case8
});
```
**check: rule.require.useBeforeAll-for-setup**
- uses `useBeforeAll` not `let` + `beforeAll`: yes
- setup creates isolated test repo: yes
- setup creates required manifests: yes
**covered**

### lines 714-719: assertions
```ts
expect(result.summary.set).toEqual(2);
expect(result.summary.failed).toEqual(0);
```
**check: explicit assertions**
- verifies success count: yes
- verifies no failures: yes
**covered**

### lines 721-728: slug assertions
```ts
const slugs = result.results.map((r) => r.slug);
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```
**check: behavior verification**
- extracts slugs from results: yes
- verifies extended key under rhight org: yes
- verifies root key under ahbode org: yes
**covered**

### absent patterns check
| pattern | expected | present |
|---------|----------|---------|
| given/when/then | yes | yes |
| useBeforeAll | yes | yes |
| realistic setup | yes | yes |
| explicit assertions | yes | yes |
| both orgs tested | yes | yes |
**no gaps**

## summary: gaps found

none.

## why each standard holds

| file | standard | why it holds |
|------|----------|--------------|
| asKeyrackKeyOrg.ts | jsdoc | lines 1-4 match extant asKeyrackKeyEnv.ts |
| asKeyrackKeyOrg.ts | arrow-only | line 5 uses `=>` syntax |
| asKeyrackKeyOrg.ts | input-context | line 5 uses `(input: {})` pattern |
| asKeyrackKeyOrg.ts | types | line 5 has explicit `string` return |
| asKeyrackKeyOrg.ts | safe fallback | line 9 uses `?? ''` like extant |
| asKeyrackKeyOrg.test.ts | given-when-then | lines 6, 7, 8 use test-fns |
| asKeyrackKeyOrg.test.ts | edge cases | case2 tests dots in key |
| fillKeyrackKeys.ts | import order | line 9 after asKeyrackKeyName |
| fillKeyrackKeys.ts | extant pattern | line 258 matches line 163 pattern |
| fillKeyrackKeys.integration.test.ts | useBeforeAll | lines 659, 693 use pattern |
| fillKeyrackKeys.integration.test.ts | assertions | lines 714-728 verify behavior |

## conclusion

all files have full coverage of mechanic role standards. no patterns absent. no gaps to fix.
