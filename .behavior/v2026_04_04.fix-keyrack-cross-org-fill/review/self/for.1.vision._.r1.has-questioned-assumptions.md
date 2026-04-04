# self-review: has-questioned-assumptions

## assumption 1: the slug's org segment is the authoritative source of org

**what do we assume here without evidence?**
we assume that when hydration creates keys from extended manifests, the org in the slug (`rhight.prod.KEY`) is intentional and should be respected.

**what evidence supports this?**
- `hydrateKeyrackRepoManifest.ts` line 82-89: creates slugs with `${org}.${env}.${key}` where `org` comes from the extended manifest's own org declaration
- line 200-203: root keys use `explicit.org` (root's org), extended keys keep their original org
- the hydration explicitly preserves org per-manifest

**what if the opposite were true?**
if all keys should use root org, then:
- extended manifests would lose their org identity
- `extends:` would "adopt" keys into the parent org
- but then why does hydration preserve the extended org in the slug?

**did the wisher actually say this, or did we infer it?**
the wisher pointed out that `get` looks under `rhight.prod.KEY` while `set` stores under `ahbode.prod.KEY`. the fix aligns `set` with `get`. the wisher did not explicitly say "use slug's org" but the symptom implies it.

**what exceptions or counterexamples exist?**
none found. the slug format is `$org.$env.$key` by design.

**verdict**: assumption holds ✓

---

## assumption 2: the fix is a one-line change at line 257

**what do we assume here without evidence?**
we assume that we can change `org: repoManifest.org` to `org: orgFromSlug` and the fix is complete.

**what evidence supports this?**
traced through `setKeyrackKey.ts`:
- line 37: `targetSlugs = [\`${input.org}.${input.env}.${input.key}\`]`
- if `input.org` comes from slug, then `targetSlugs[0]` will match the original slug

wait — the `input.key` is `keyName` (just the key name, e.g., `USPTO_ODP_API_KEY`), not the full slug. so the slug gets reconstructed as `${orgFromSlug}.${input.env}.${keyName}` which should equal the original slug.

**what if the opposite were true?**
if other places use `repoManifest.org` incorrectly, we'd have similar bugs. let me check...

actually, the vision shows one fix location. but should we verify no other places have this issue?

**what exceptions or counterexamples exist?**
other keyrack commands (set, unlock, get) take explicit `--key` and `--env` flags, they don't iterate over manifest keys. fill is unique — it iterates manifest keys.

**verdict**: assumption holds — fill is the only place that iterates manifest keys and needs to extract org from each slug ✓

---

## assumption 3: the env segment of the slug matches input.env

**what do we assume here without evidence?**
we assume that for each slug returned by `getAllKeyrackSlugsForEnv`, the slug's env segment equals `input.env`.

**what evidence supports this?**
- `getAllKeyrackSlugsForEnv.ts` line 19-21: filters to `spec.env === input.env`
- so slugs like `rhight.test.KEY` would not be returned when `input.env === 'prod'`

**what if the opposite were true?**
if env mismatch were possible, we'd have slug reconstruction errors. but the filter ensures match.

**what exceptions or counterexamples exist?**
env.all keys: line 14 returns all slugs when `input.env === 'all'`. but when `input.env` is specific (e.g., 'prod'), env.all slugs are... wait, the comment says "env.all keys are already expanded to env-specific slugs via hydration."

let me verify: in `hydrateKeyrackRepoManifest.ts` lines 80-90, env.all keys create `.all.` slugs. lines 93-104 also create env-specific slugs for each declared env. so `getAllKeyrackSlugsForEnv` would return the env-specific slug, not the .all. slug, when `input.env !== 'all'`.

but wait — line 18 says "exclude .all. slugs here to avoid duplicates". so we wouldn't get `.all.` slugs unless `input.env === 'all'`.

**verdict**: assumption holds ✓

---

## summary

all assumptions verified:
1. slug's org segment is authoritative — supported by hydration logic
2. fix is localized to line 257 — fill is unique: it iterates manifest keys
3. env matches input.env — enforced by `getAllKeyrackSlugsForEnv` filter
