# self-review r2: has-zero-deferrals

## purpose

verify that no vision requirement is deferred in the blueprint. zero leniency.

---

## method

1. extract each explicit requirement from the vision
2. trace each to the blueprint
3. verify no "deferred", "future work", "out of scope", or similar language
4. articulate why each holds

---

## vision requirement 1: fill prompts for mech selection

**vision says:**
> "same flow as set. user chooses mechanism."
> "which mechanism? 1. PERMANENT_VIA_REPLICA — static secret 2. EPHEMERAL_VIA_GITHUB_APP — github app"

**blueprint says:**
- codepath tree shows: `vault.set({ slug, mech: keySpec?.mech ?? null, ... })` → `mech null + vault supports multiple mechs` → `inferKeyrackMechForSet # prompts "which mechanism?"`
- this is the same path `set` takes — no special fill logic

**why it holds:**
the blueprint traces the full path from fill to mech prompt. the key insight is that fill now passes `null` to vault.set (because hydration no longer hardcodes a mech), which triggers the same inference logic that set uses. the blueprint shows this explicitly in the codepath tree with `[○] inferKeyrackMechForSet` — the [○] means "retain" (reuse extant code, no changes needed). fill inherits set's behavior by construction.

**deferred?** no. the prompt path is fully traced in the blueprint.

---

## vision requirement 2: same flow as set

**vision says:**
> "same flow as set. user chooses mechanism. guided setup proceeds accordingly."
> "fill asks how i want to store each credential, then walks me through it."

**blueprint says:**
- changes detail section 2 removes the divergence point (`mech: 'PERMANENT_VIA_REPLICA'` → `mech: null`)
- codepath tree shows fill → vault.set → inferKeyrackMechForSet → mechAdapter.acquireForSet

**why it holds:**
the root cause of the parity gap was hydrateKeyrackRepoManifest hardcoded `mech: 'PERMANENT_VIA_REPLICA'`. the blueprint explicitly removes this at all 3 locations (env.all keys, expanded keys, env-specific keys). once removed, fill inherits vault.set's behavior because fillKeyrackKeys already calls `vault.set({ mech: keySpec?.mech ?? null })`. the blueprint doesn't add new code — it removes the divergence.

**deferred?** no. the divergence is removed in changes detail section 2.

---

## vision requirement 3: guided setup for all mechs

**vision says:**
> "choice: 2 [EPHEMERAL_VIA_GITHUB_APP] → which github org? ..."
> "guided setup: org → app → pem path"

**blueprint says:**
- codepath tree shows both mech adapters under "mech inferred":
  - `mechAdapterReplica.acquireForSet # prompts for secret`
  - `mechAdapterGithubApp.acquireForSet # tilde expansion fix`

**why it holds:**
the blueprint shows both mech adapters in the codepath tree. mechAdapterReplica prompts for the static secret. mechAdapterGithubApp runs guided setup (org → app → pem path). these are marked [○] (retain) — the adapters already exist and work. the only change is mechAdapterGithubApp gets tilde expansion (marked [~]). guided setup is not deferred because it already exists; the blueprint just enables fill to reach it.

**deferred?** no. guided setup is reused, not deferred.

---

## vision requirement 4: parity with set

**vision says:**
> "fill just works now — i don't have to detour through set for ephemeral credentials."
> "parity with set — no special-casing"

**blueprint says:**
- summary states: "enable keyrack fill to prompt for mechanism selection (like keyrack set)"
- changes detail section 2: "root cause fix — fill passed hardcoded mech, so vault never prompted"

**why it holds:**
the blueprint's summary explicitly states the goal is parity. the changes are subtractive (remove hardcode) rather than additive (add new fill logic). this is the simplest path to parity — fill and set converge on the same vault.set codepath. the blueprint doesn't mention any remaining gaps between fill and set.

**deferred?** no. parity is achieved by removing the divergence.

---

## vision requirement 5: no key-name-based inference

**vision says:**
> "confirmed: no key-name-based inference (e.g., `*_GITHUB_TOKEN` → auto-select ephemeral)"
> "fill should prompt just like set does"

**blueprint says:**
- no inference logic added
- KeyrackKeySpec.mech is nullable, hydration sets `mech: null`
- vault adapter handles via `inferKeyrackMechForSet` which prompts the user

**why it holds:**
the vision explicitly rejected key-name-based inference. the blueprint adds no inference logic — it simply makes mech nullable and lets the vault adapter prompt. the blueprint doesn't mention any pattern matching on key names. the only "inference" is what the vault adapter already does: prompt when mech is null and vault supports multiple mechs.

**deferred?** no. key-name-based inference was never a requirement — its absence is the requirement, which holds.

---

## vision requirement 6: tilde expansion for pem path

**vision says:**
(this is from the handoff, not the vision proper, but is in scope)
> user paths with `~/` failed with ENOENT

**blueprint says:**
- changes detail section 3: "mechAdapterGithubApp tilde expansion"
- diff: `const pemPathExpanded = pemPath.trim().replace(/^~(?=$|\/|\\)/, homedir());`

**why it holds:**
the blueprint includes explicit diff for tilde expansion. the fix is simple: call `homedir()` to expand `~` before `readFileSync`. this is in changes detail section 3 with the exact code. the blueprint explains why: "Node doesn't expand `~` like shell."

**deferred?** no. the fix is in the blueprint with explicit diff.

---

## scan for deferral language

searched blueprint line-by-line for deferral indicators:

| term | found? | location if found |
|------|--------|-------------------|
| "deferred" | no | — |
| "defer" | no | — |
| "future work" | no | — |
| "out of scope" | no | — |
| "not included" | no | — |
| "later" | no | — |
| "TODO" | no | — |
| "FIXME" | no | — |
| "consider" | no | — |
| "eventually" | no | — |
| "skip" | no | — |
| "postpone" | no | — |

---

## vision "future" items (not requirements)

the vision mentions one future enhancement:

> "future: could add `KEY_NAME: { mech: EPHEMERAL_VIA_GITHUB_APP }`"

**why this is not a deferral:**
this appears in the vision's "open questions" section under "future" — it's explicitly marked as a potential enhancement, not a requirement. the blueprint correctly does not include it. deferring a "future" item is not a deferral violation.

---

## blueprint "implicit" test coverage (not deferrals)

the blueprint notes some test coverage is "implicit":

| case | why implicit is acceptable |
|------|---------------------------|
| fill prompts for mech | vault adapter handles prompt; fill's behavior is tested via vault.set tests |
| tilde expansion | acquireForSet requires stdin; integration tests cover the flow |
| null mech passthrough | hydrateKeyrackRepoManifest unit tests pass with null (they don't assert mech) |

**why these are not deferrals:**
the features are implemented. the tests are implicit because:
1. extant tests cover the behavior indirectly
2. explicit tests would require stdin mocks (complex, low value)
3. the changes are minimal — removed hardcoded values, not new logic

"implicit test coverage" ≠ "deferred feature"

---

## conclusion

**zero deferrals found.**

each vision requirement maps to explicit blueprint content:
1. mech prompt → codepath tree traces fill → vault.set → inferKeyrackMechForSet
2. same flow as set → changes detail section 2 removes divergence
3. guided setup → codepath tree shows both mech adapters
4. parity with set → summary + root cause fix
5. no key-name inference → no inference logic added, just null passthrough
6. tilde expansion → changes detail section 3 with explicit diff

the blueprint delivers the complete vision contract with no deferrals.
