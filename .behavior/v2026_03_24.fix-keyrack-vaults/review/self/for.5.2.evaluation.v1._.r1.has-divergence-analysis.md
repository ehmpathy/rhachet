# self-review: has-divergence-analysis

## verification method

compared blueprint filediff tree vs evaluation filediff tree line by line. compared blueprint codepath tree vs evaluation codepath tree. compared blueprint domain objects vs evaluation domain objects.

## divergence audit

### D1: deprecated aliases retained

| blueprint | actual |
|-----------|--------|
| only canonical mech names | retained REPLICA, REFERENCE, GITHUB_APP, AWS_SSO |

**why this divergence is correct:**

host manifests in the wild may use deprecated aliases. if we removed them:
1. `keyrack unlock` would fail to find mech adapter
2. users would need to manually migrate manifests
3. no warn or migration path

the fix is correct: keep aliases, mark @deprecated, use canonical names in new code. backwards compat preserved.

### D2: test fixture uses REFERENCE alias

| blueprint | actual |
|-----------|--------|
| mech=PERMANENT_VIA_REFERENCE | mech=REFERENCE |

**why this divergence is correct:**

the test fixture intentionally uses the deprecated alias to prove backwards compat works. if the alias failed, the test would catch it. this is a feature of the test suite, not an oversight.

### D3: os.daemon writes to host manifest

| blueprint | actual |
|-----------|--------|
| considered "no manifest entry" | writes vault=os.daemon pointer |

**why this divergence is correct:**

vision doc clarifies: "host manifest tracks vault location". for os.daemon:
- secret lives in daemon memory only (ephemeral)
- manifest records `vault=os.daemon` so unlock knows where to look
- without manifest entry, `keyrack unlock` cannot route to correct vault

the secret is ephemeral (no disk). the pointer is durable. this is correct.

### potential divergences NOT found

| area | status | why not a divergence |
|------|--------|---------------------|
| promptVisibleInput.ts location | matches | both blueprint and evaluation show [+] in infra/ |
| setKeyrackKey.ts vs setKeyrackKeyHost.ts | explained by D3 | blueprint said "skip manifest" but vision clarified manifest IS needed; skip relock instead |
| mech type name convention | matches | EPHEMERAL_VIA_SESSION and PERMANENT_VIA_REFERENCE both use canonical convention |
| test coverage | complete | all unit, integration, acceptance tests documented |

## hostile reviewer check

**what would a hostile reviewer find?**

1. "you said deprecated aliases removed but kept them" — documented in D1, explained with rationale
2. "test fixture uses old alias" — documented in D2, intentional for backwards compat test
3. "os.daemon writes manifest, blueprint said not to" — documented in D3, vision doc clarifies this is correct
4. "absent files in evaluation" — git diff audit confirmed all 24 files documented

**no undocumented divergences found.**

## conclusion

three divergences documented, all intentional and explained. no additional divergences found. evaluation accurately reflects implementation vs blueprint differences.
