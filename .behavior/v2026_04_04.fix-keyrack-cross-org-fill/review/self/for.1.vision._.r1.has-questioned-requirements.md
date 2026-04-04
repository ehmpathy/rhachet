# self-review: has-questioned-requirements

## requirement 1: extract org from slug instead of use repoManifest.org

**who said this was needed?**
the wish shows a concrete failure: `fill` prompts with `ahbode.prod.USPTO_ODP_API_KEY` but verifies with `rhight.prod.USPTO_ODP_API_KEY`. the user who filed the wish observed this divergence.

**what evidence supports this?**
traced through code:
- `hydrateKeyrackRepoManifest.ts` lines 188-189: extended keys preserve their original org in the slug
- `fillKeyrackKeys.ts` line 257: passes `org: repoManifest.org` (root org) — ignores slug's org
- `getKeyrackKeyGrant.ts` line 215: uses `input.for.key` (the slug) directly

the divergence is clear in the code path.

**what if we didn't do this?**
fill would remain broken for cross-org extends. users would be unable to use `extends:` across orgs without manual workarounds.

**is the scope too large, too small, or misdirected?**
scope is correct — this is a single line fix with clear before/after behavior.

**could we achieve the goal in a simpler way?**
the fix proposed (extract org from slug) is already minimal. no simpler approach available.

**verdict**: requirement holds ✓

---

## requirement 2: preserve env from slug as well?

**who said this was needed?**
not explicitly mentioned in the wish, but the same logic applies.

**what evidence supports this?**
at line 258 in `fillKeyrackKeys.ts`: `env: input.env` — this uses the input env, not the slug's env. but wait — for fill, the `input.env` is what the user requested (e.g., `--env prod`). the slug's env should match.

**what if we didn't do this?**
need to verify: does `input.env` match the slug's env segment? `getAllKeyrackSlugsForEnv` filters to keys where `spec.env === input.env`. so the slug's env should match `input.env`.

**could we achieve the goal in a simpler way?**
`input.env` is correct here. no change needed.

**verdict**: not a requirement — `input.env` is already correct ✓

---

## requirement 3: should we add a helper function asKeyrackKeyOrg?

**who said this was needed?**
suggested in the vision as an option, not a requirement.

**what evidence supports this?**
other places may need to extract org from slug. but inline `slug.split('.')[0]!` is also clear.

**what if we didn't do this?**
the fix still works. helper is optional.

**could we achieve the goal in a simpler way?**
inline extraction is simpler. helper can be added later if pattern repeats.

**verdict**: not a requirement — inline extraction suffices ✓

---

## summary

only one requirement is needed: extract org from slug at line 257 in `fillKeyrackKeys.ts`.

the scope is minimal and well-justified by the concrete failure in the wish.
