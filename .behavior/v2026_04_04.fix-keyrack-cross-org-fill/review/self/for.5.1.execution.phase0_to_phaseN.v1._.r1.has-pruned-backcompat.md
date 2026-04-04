# self-review: has-pruned-backcompat

## backwards compatibility concerns

### fillKeyrackKeys.ts behavior change

**change:** `org: repoManifest.org` → `org: asKeyrackKeyOrg({ slug })`

**does this break extant behavior?**
- for single-org repos: no — slug's org equals `repoManifest.org`, behavior unchanged
- for cross-org extends: the old behavior was a bug, not a feature to preserve

**did we add backwards compat shims?** no

**was backwards compat explicitly requested?** no — the wish describes a bug, not a feature deprecation

## conclusion

no backwards compatibility shims were added. the change is a bug fix, not a contract break. for single-org repos (the common case), behavior is unchanged. for cross-org extends, the old behavior was broken.
