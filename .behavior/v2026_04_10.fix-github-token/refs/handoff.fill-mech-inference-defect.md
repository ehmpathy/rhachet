# handoff: keyrack fill mech inference defect

## .symptom

`keyrack fill` skips mech selection prompt, goes straight to "enter secret for..." (PERMANENT_VIA_REPLICA).

`keyrack set` works correctly — shows "which mechanism?" prompt.

## .root cause

`hydrateKeyrackRepoManifest.ts` hardcodes `mech: 'PERMANENT_VIA_REPLICA'` for every key:
- line 85 (env.all keys)
- line 99 (env.all expanded to declared envs)
- line 114 (env-specific keys)

**flow:**
1. `fill` reads repo manifest → every `KeyrackKeySpec` has `mech: 'PERMANENT_VIA_REPLICA'`
2. `fillKeyrackKeys.ts` line 242: `mech = keySpec?.mech ?? null` — but `keySpec.mech` is ALWAYS set
3. so `mech` is never null → `inferKeyrackMechForSet` is never called
4. goes straight to `mechAdapterReplica.acquireForSet` → "enter secret for..."

**why `set` works:** CLI doesn't read from repo manifest for mech — only passes what user provides via `--mech`.

## .desired behavior

`keyrack fill` should use the same flow as `keyrack set` — when mech is not declared in manifest, the vault adapter prompts for mech selection via `inferKeyrackMechForSet`.

## .fix approach

make `mech` nullable in `KeyrackKeySpec` — only set if explicitly declared in keyrack.yml. remove the hardcoded default from hydration.

**files:**
- `src/domain.objects/keyrack/KeyrackKeySpec.ts` — make `mech: KeyrackGrantMechanism | null`
- `src/access/daos/daoKeyrackRepoManifest/hydrate/hydrateKeyrackRepoManifest.ts` — change `mech: 'PERMANENT_VIA_REPLICA'` to `mech: null`

**flow after fix:**
1. `fill` reads repo manifest → `KeyrackKeySpec` has `mech: null` (unless explicitly declared)
2. `fillKeyrackKeys.ts`: `mech = keySpec?.mech ?? null` → `mech` is null
3. vault adapter receives `mech: null` → calls `inferKeyrackMechForSet` → prompts "which mechanism?"
4. same flow as `keyrack set`
