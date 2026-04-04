# self-review r4: has-pruned-backcompat

round 4 — deeper backcompat review with fresh eyes.

---

## re-read the blueprint

the blueprint has 4 sections. let me read each one for backcompat concerns.

### summary section

> "fix the bug where `fillKeyrackKeys` uses `repoManifest.org` instead of the org embedded in each key's slug."

no backcompat concern mentioned. this is a bug fix, not a feature.

### filediff tree section

shows one line change. no backcompat concern.

### test coverage section

tests the fix. no backcompat concern.

### contracts section

shows before/after code. the "input contract (unchanged)" subsection is notable.

---

## deeper question: what about the "input contract (unchanged)" statement?

**the claim**: `fillKeyrackKeys` input params don't change.

**is this accurate?** let me verify by read of the fix:

```ts
// before
org: repoManifest.org

// after
const orgFromSlug = slug.split('.')[0]!;
org: orgFromSlug
```

the fix changes what org is passed to `setKeyrackKey`, not the input params of `fillKeyrackKeys`.

**verdict**: the "input contract (unchanged)" statement is accurate. no backcompat concern.

---

## deeper question: could the buggy behavior have worked in any scenario?

r3 said the buggy behavior "always fails". let me verify this.

**scenario 1**: root manifest, no extends

```yaml
org: ahbode
env.prod:
  - AWS_PROFILE
```

slug = `ahbode.prod.AWS_PROFILE`

before fix: `org = repoManifest.org = ahbode`
after fix: `org = slug.split('.')[0] = ahbode`

same result. no change.

**scenario 2**: root extends child with same org

```yaml
# root
org: ahbode
extends:
  - child.yml
env.prod:
  - ROOT_KEY

# child
org: ahbode
env.prod:
  - CHILD_KEY
```

both keys have slug that starts with `ahbode`.

before fix: `org = ahbode` (correct)
after fix: `org = ahbode` (correct)

same result. no change.

**scenario 3**: root extends child with different org (THE BUG)

```yaml
# root
org: ahbode
extends:
  - child.yml

# child
org: rhight
env.prod:
  - USPTO_KEY
```

child key has slug `rhight.prod.USPTO_KEY`.

before fix: `org = ahbode` (WRONG)
after fix: `org = rhight` (CORRECT)

this is the only scenario where behavior changes.

---

## conclusion

the fix only affects scenario 3 (cross-org extends). in scenarios 1 and 2, behavior is unchanged.

scenario 3 was broken — roundtrip verification always failed. the fix makes it work.

no backcompat concern because:
1. scenarios 1 and 2 are unchanged
2. scenario 3 was broken and is now fixed
3. no workflow could have depended on the broken behavior

---

## why this holds

the key insight is: **the buggy behavior always failed at roundtrip verification**.

roundtrip verification does:
1. set key
2. unlock key
3. get key
4. if get returns absent → fail

with the bug, step 1 stores under `ahbode` but step 3 looks under `rhight`. step 4 always fails.

therefore, no user could have successfully stored a cross-org key. no migration or backcompat shim is needed.

---

## summary

no backcompat concerns found. all 3 scenarios analyzed:

| scenario | before fix | after fix | verdict |
|----------|------------|-----------|---------|
| no extends | works | works | unchanged |
| same-org extends | works | works | unchanged |
| cross-org extends | fails | works | fixed |

no backcompat issue. the fix only affects a broken scenario.
