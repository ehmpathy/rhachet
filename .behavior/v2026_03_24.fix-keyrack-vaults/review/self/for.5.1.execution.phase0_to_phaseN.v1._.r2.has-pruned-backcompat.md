# review.self: has-pruned-backcompat (r2)

## the question

did we add backwards compatibility concerns that were not explicitly requested?

for each backwards-compat concern in the code, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

## artifacts reviewed

- wish: `.behavior/v2026_03_24.fix-keyrack-vaults/0.wish.md`
- vision: `.behavior/v2026_03_24.fix-keyrack-vaults/1.vision.md`
- blueprint: `.behavior/v2026_03_24.fix-keyrack-vaults/3.3.1.blueprint.product.v1.i1.md`
- execution: `.behavior/v2026_03_24.fix-keyrack-vaults/5.1.execution.phase0_to_phaseN.v1.i1.md`
- code: `src/domain.operations/keyrack/adapters/vaults/`

## review

### what was the wish?

the wish asked for two new capabilities:
1. `keyrack set --key EXAMPLE_KEY --vault os.daemon`
2. `keyrack set --key EXAMPLE_KEY --vault 1password`

the wish did NOT ask for:
- backwards compatibility with prior code
- deprecation of prior functionality
- migration from old to new

this was **purely additive work**. no prior functionality needed to be maintained because no prior functionality was changed.

### backwards-compat concern analysis

| potential concern | did we add it? | was it requested? | verdict |
|-------------------|----------------|-------------------|---------|
| maintain extant mech types | no change made | n/a | non-issue |
| maintain extant adapter interface | no change made | n/a | non-issue |
| maintain extant vault adapters | no change made | n/a | non-issue |
| directory restructure preserves exports | yes | no | **review** |

### directory restructure preserves exports — is this unnecessary compat?

we moved vault adapters into subdirectories:
```
adapters/vaults/vaultAdapterOsSecure.ts → adapters/vaults/os.secure/vaultAdapterOsSecure.ts
```

we updated `adapters/vaults/index.ts` to re-export from the new paths.

**question:** did we need to maintain the same export interface?

**answer:** this was an internal restructure. the adapters are not public API — they are consumed within keyrack only via `genContextKeyrackGrantUnlock.ts` which imports from the index. no external consumers exist.

the re-export was not "backwards compat" — it was simply the correct way to restructure: update the index to point to new locations. this is normal refactor practice, not defensive compat.

**verdict:** non-issue. this is standard refactor, not unnecessary compat.

### did we add any defensive compat "to be safe"?

code changes review:
- no `@deprecated` annotations added
- no fallback code paths for "old" vs "new" behavior
- no conditional logic based on version detection
- no migration utilities
- no legacy aliases

**verdict:** no defensive compat was added. the work was purely additive.

## conclusion

no unnecessary backwards compatibility was added. the work was additive:
- new mech types added to union (additive)
- new vault adapters implemented (additive)
- new index file added (additive)
- directory restructure was internal with no external consumers

there are no open questions for the wisher about backwards compatibility.
