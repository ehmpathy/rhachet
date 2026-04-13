# self-review: has-critical-paths-frictionless (round 7)

## pause

i searched for repros artifact and traced the critical path through tests.

## repros artifact status

```
$ glob '.behavior/v2026_04_10.fix-github-token/3.2.distill.repros*.md'
No files found
```

**no repros artifact exists** because this is a bug fix, not a journey feature.

as established in prior self-reviews (r4, r5): repros documents sketch user journeys. this behavior route is a single behavioral change:
- before: fill hardcodes mech to PERMANENT_VIA_REPLICA
- after: fill prompts for mech (like set does)

## critical path identification

from the criteria (2.1.criteria.blackbox.yield.md), the critical path is:

```
usecase 1: fill prompts for mech when vault supports multiple mechs
```

## trace: critical path

### path: fill → prompt → select → set

1. user runs: `rhx keyrack fill --env test`
2. fill iterates keys from manifest
3. for each key not already set:
   - fill calls vault.set() with mech: null
   - vault.set() calls inferKeyrackMechForSet()
   - inferKeyrackMechForSet() prompts: "which mechanism?"
   - user selects '1' (PERMANENT_VIA_REPLICA) or '2' (EPHEMERAL_VIA_GITHUB_APP)
   - mech adapter runs guided setup
   - key is stored

### test verification

from `fillKeyrackKeys.integration.test.ts` case2:

```
console.log
  which mechanism?
  at log (src/domain.operations/keyrack/inferKeyrackMechForSet.ts:46:11)

console.log
  1. PERMANENT_VIA_REPLICA — static secret (api key, password)
  2. EPHEMERAL_VIA_GITHUB_APP — github app installation (short-lived tokens)
  at log (src/domain.operations/keyrack/inferKeyrackMechForSet.ts:47:11)
```

the test:
- mocks stdin with `setMockPromptLineValues(['1', '1'])`
- fill prompts for mech
- test answers '1'
- key is stored
- assertions verify: `result.summary.set === 2`

### snapshot proof

from `fillKeyrackKeys.integration.test.ts.snap`:

```
🔐 keyrack fill (env: test, keys: 2, owners: 1)

🔑 key 1/2, API_KEY, for 1 owner
   └─ for owner case2j1
      ├─ set the key
      │  ├─
      │  │
      │  │
      │  └─
      └─ get after set, to verify
         ├─ ✓ rhx keyrack unlock --key API_KEY --env test --owner case2j1
         └─ ✓ rhx keyrack get --key API_KEY --env test --owner case2j1
```

the tree shows:
- "set the key" — fill called vault.set
- "get after set, to verify" — fill verified the key was stored
- both checkmarks — the flow completed without error

## friction analysis

| step | potential friction | status |
|------|-------------------|--------|
| prompt renders | could fail to display | **verified** (console output shows prompt) |
| user selection | could reject invalid input | **delegated** (promptLineInput handles validation) |
| mech adapter | could fail guided setup | **verified** (test completes, key stored) |
| verification | could fail get after set | **verified** (snapshot shows checkmarks) |

## why it holds

the critical path is frictionless because:

1. **prompt renders correctly** — "which mechanism?" with numbered options
2. **selection flows through** — mock stdin '1' reaches mech adapter
3. **mech adapter completes** — key stored (summary.set === 2)
4. **verification passes** — get after set succeeds

the fix enables the prompt. the prompt infrastructure (inferKeyrackMechForSet) was already battle-tested in keyrack set. fill now uses the same infrastructure.

## verdict

no repros artifact because this is a bug fix.

the critical path (fill → prompt → select → set) is verified via:
- integration test execution
- console output capture
- snapshot proof of tree structure

the path is frictionless in practice.

