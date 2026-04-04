# self-review r6: has-behavior-declaration-coverage

review for coverage of behavior declaration requirements.

---

## requirements from vision

### requirement 1: fix org extraction

> "extract org from slug instead of `repoManifest.org` in `fillKeyrackKeys.ts` line 257"

**blueprint coverage**: yes. filediff tree shows:
```
line 257: org: repoManifest.org → org: slug.split('.')[0]!
```

✓ covered

### requirement 2: keys from extended manifests use their org

> "keys from extended manifests are stored under their original org, not the root org"

**blueprint coverage**: yes. contracts section shows before/after:
```ts
// before
org: repoManifest.org,  // ← uses root org for ALL keys

// after
org: orgFromSlug,  // ← respects each key's org from its slug
```

✓ covered

### requirement 3: test coverage for cross-org extends

> "usecase: nested keyrack via extends"

**blueprint coverage**: yes. test coverage section shows:
```
[case8] cross-org extends (root=ahbode, extended=rhight)
```

the test verifies:
- USPTO_ODP_API_KEY stored under rhight (extended org)
- AWS_PROFILE stored under ahbode (root org)

✓ covered

---

## summary

| requirement | blueprint section | status |
|-------------|-------------------|--------|
| fix line 257 | filediff tree | ✓ covered |
| respect slug org | contracts | ✓ covered |
| cross-org test | test coverage | ✓ covered |

all requirements from the vision are addressed in the blueprint.

