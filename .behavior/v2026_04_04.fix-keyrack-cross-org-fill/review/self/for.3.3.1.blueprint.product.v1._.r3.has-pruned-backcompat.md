# self-review r3: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## scan blueprint for backwards-compat concerns

the blueprint contains:
1. summary — no backcompat concerns mentioned
2. filediff tree — shows one-line change
3. test coverage — tests the fix
4. contracts — shows before/after code

---

## does the fix break backwards compat?

**the change**: `org: repoManifest.org` → `org: slug.split('.')[0]!`

**impact**:
- keys from root manifest (org matches `repoManifest.org`): no change
- keys from extended manifest (org differs from `repoManifest.org`): NOW stored under correct org

**question**: does this break any workflows that depend on the buggy behavior?

**answer**: the buggy behavior is:
1. user runs `fill --env prod`
2. extended key (org: rhight) stored under wrong org (ahbode)
3. roundtrip verification fails
4. user sees error

no workflow depends on this. the buggy behavior always fails.

---

## is backwards compat explicitly requested?

**scan the wish**: the wisher said:

> "probably, ideally, we'd carry the original org all the way through."

this explicitly requests the fix. no backwards compat requested.

---

## are there any implicit backcompat assumptions?

**question 1**: what if users have keys already stored under the wrong org?

**answer**: those keys would need to be re-set. but the buggy behavior always fails at roundtrip verification, so no keys could have been successfully stored under the wrong org.

**question 2**: what about the contracts section's "input contract (unchanged)"?

**answer**: this states that `fillKeyrackKeys` input params don't change. this is accurate — the fix is internal. no backcompat concern here.

---

## summary

no backwards-compat concerns found. the fix changes internal behavior but:
- the buggy behavior always failed (roundtrip verification)
- no workflows depend on the buggy behavior
- the wisher explicitly requested this change

no backcompat prune needed.
