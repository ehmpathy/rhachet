# self-review r2: has-questioned-assumptions

round 2 — fresh eyes on the same artifacts.

---

## re-read the wish

the wish shows:
1. user runs `keyrack fill --env prod` in rhight repo
2. prompt shows `ahbode.prod.USPTO_ODP_API_KEY`
3. get checks `rhight.prod.USPTO_ODP_API_KEY`
4. mismatch causes roundtrip failure

the wisher asks: "why does the set choose `ahbode` when the get does not?"

---

## assumption check: is the fix location correct?

in r1 i assumed line 257 in `fillKeyrackKeys.ts` is the fix location.

let me re-verify the call chain:
1. `fillKeyrackKeys` line 253-264 calls `setKeyrackKey` with `org: repoManifest.org`
2. `setKeyrackKey` line 37 constructs slug as `${input.org}.${input.env}.${input.key}`
3. so if `input.org` is `ahbode` and `input.key` is `USPTO_ODP_API_KEY`, slug becomes `ahbode.prod.USPTO_ODP_API_KEY`

but the manifest key slug is `rhight.prod.USPTO_ODP_API_KEY` — this is what `getAllKeyrackSlugsForEnv` returns.

**issue found**: the slug from manifest already has the correct org, but we pass `repoManifest.org` (ahbode) instead of extract from the slug.

**verdict**: fix location is correct ✓

---

## assumption check: does the fix break any other behavior?

what else uses `repoManifest.org`?

- in `fillKeyrackKeys.ts` line 91: emits `env: ${input.env}` in header — this is for display only, no org
- in `fillKeyrackKeys.ts` line 141: emits header `keyrack fill (env: ${input.env}, keys: ${slugs.length}, ...)` — no org
- in `fillKeyrackKeys.ts` line 257: the fix location

so `repoManifest.org` is only used at line 257 within fill. the fix is isolated.

**verdict**: no side effects ✓

---

## assumption check: should repoManifest write happen under root org or slug org?

`setKeyrackKey` calls `setKeyrackKeyHost` which may write to repo manifest via `daoKeyrackRepoManifest.set.findsertKeyToEnv`.

`findsertKeyToEnv` has findsert semantics (line 145-154 checks if key already present). since the hydrated manifest already has the key, would it appear in root's env.prod section?

no — `findsertKeyToEnv` operates on the root keyrack.yml file, not on the hydrated manifest. so if the key is declared in extended but not in root, it would get added to root.

**but wait**: that's expected behavior for fill. fill adds keys to the repo manifest so future `keyrack unlock` knows which keys to load. if a key comes from an extended manifest, it still needs to be accessible.

the bug is not about manifest writes — it's about the slug used for host manifest storage and daemon registration.

**verdict**: manifest write behavior is separate from the slug bug ✓

---

## assumption check: correct interpretation of which repo is root vs extended

the wish says:
> the root keyrack is for org `ahbode`
> but the nested, extended keyrack is for org `rhight`

so:
- root = ahbode (the user's repo)
- extended = rhight (via extends)
- key declared in rhight: rhight.prod.USPTO_ODP_API_KEY
- repoManifest.org = ahbode
- line 257 passes org: ahbode
- set stores under ahbode.prod.USPTO_ODP_API_KEY
- get looks for rhight.prod.USPTO_ODP_API_KEY (the original slug)

**now it makes sense!** the user is in ahbode repo, which extends rhight. keys from rhight should stay under rhight's org, but fill uses ahbode's org.

**verdict**: original analysis is correct — extract org from slug, not from repoManifest.org ✓

---

## summary

r2 review surfaced confusion about which repo was root vs extended. clarified that:
- root repo (ahbode) extends nested repo (rhight)
- keys from rhight have slugs with org=rhight
- fill incorrectly uses root's org (ahbode) for all keys
- fix: use org from each key's slug
