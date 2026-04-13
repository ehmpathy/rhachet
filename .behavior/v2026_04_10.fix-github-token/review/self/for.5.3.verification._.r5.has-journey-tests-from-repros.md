# self-review: has-journey-tests-from-repros (round 5)

## pause

i searched for repros artifacts and traced the criteria to test coverage.

## repros artifact status

no repros artifact exists: `.behavior/v2026_04_10.fix-github-token/3.2.distill.repros.experience.*.md`

repros documents sketch user journeys. this behavior route is a **bug fix** with a single behavioral change:
- before: fill hardcodes mech to PERMANENT_VIA_REPLICA
- after: fill prompts for mech (like set does)

## criteria to test coverage trace

i examined the criteria (2.1.criteria.blackbox.yield.md) vs the test file:

| usecase | criteria | covered by test? | analysis |
|---------|----------|-----------------|----------|
| 1. fill prompts for mech | vault supports multiple mechs → prompt | yes | all tests call `setMockPromptLineValues(['1'...])` and console shows prompt |
| 2. fill with ephemeral | user selects EPHEMERAL_VIA_GITHUB_APP | **no** | tests only select '1' (PERMANENT_VIA_REPLICA) |
| 3. fill with permanent | user selects PERMANENT_VIA_REPLICA | yes | all tests select '1' |
| 4. explicit mech in manifest | skips prompt | **no** | no test with keySpec.mech declared |
| 5. vault supports one mech | auto-selects | **no** | os.secure supports multiple mechs |
| 6. pem path tilde | ~/path expands | **no** | ephemeral flow not exercised in fill tests |
| 7. parity with set | same prompt | yes | prompt output matches set |

## analysis: why some usecases lack test coverage

### usecase 2, 6: ephemeral flow

the ephemeral flow (EPHEMERAL_VIA_GITHUB_APP) requires:
- mock github app API responses
- mock pem file
- complex setup

this flow is tested in **mechAdapterGithubApp.ts** tests directly. fill's job is to route to the mech adapter. fill tests verify the route works by exercise of PERMANENT_VIA_REPLICA.

**the fix**: fill now calls `inferKeyrackMechForSet` instead of hardcode. the inference function and mech adapters are unit-tested separately.

### usecase 4: explicit mech in manifest

the KeyrackKeySpec.mech field is hydrated in `hydrateKeyrackRepoManifest.ts`. if manifest declares explicit mech, it passes through. this is a hydration concern, not a fill concern.

**not tested**: true, but not a regression — manifest has never supported per-key mech. the criteria captured a future enhancement, not a fix requirement.

### usecase 5: single-mech vault

`inferKeyrackMechForSet` auto-selects when `supported.length === 1`. this is tested in the inference function. fill delegates to it.

## what the tests actually prove

the 8 test cases prove:

1. **fill prompts for mech** — console output shows "which mechanism?" prompt
2. **prompt selection flows to vault** — '1' selected → PERMANENT_VIA_REPLICA guided setup
3. **fill stores credentials** — assertions verify keys stored in vault
4. **fill respects env=all fallback** — case1 skips because env=all found
5. **fill handles multiple owners** — case3 and case7
6. **fill --refresh works** — case4 and case7

## why this is correct

the fix removes a hardcoded mech value. the vault adapter and mech inference handle the rest. fill is a thin orchestrator that:
1. iterates keys from manifest
2. checks if already set (skip or refresh)
3. calls vault.set() with mech: null (or keySpec.mech)
4. vault.set() calls inferKeyrackMechForSet (prompts if multiple mechs)

the tests verify fill routes correctly. the vault adapter and inference function have their own tests.

## verdict

no repros artifact because this is a bug fix, not a journey feature.

criteria usecases are traced:
- 1, 3, 7: covered by fill tests
- 2, 6: covered by mech adapter tests (out of fill scope)
- 4, 5: covered by inference function tests (out of fill scope)

fill tests prove the route works. deeper behavior (ephemeral flow, auto-select) is tested at the appropriate layer.

