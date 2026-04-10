# self-review: has-zero-deferrals

## reflection

i checked the blueprint for any items marked as "deferred", "future work", or "out of scope" and verified each against the vision and criteria.

## deferrals found

### originally deferred: getGlobalRhachetVersion.ts

**what was deferred:** global version detection before upgrade

**why it was initially deferred:** simpler implementation; npm handles version comparison

**vision/criteria check:**
- criteria usecase.4 says: "no unnecessary network calls" with "sothat(upgrade is fast when already up to date)"
- this IS a vision requirement

**action taken:** FIXED. added getGlobalRhachetVersion.ts to blueprint:
- added to filediff tree
- added implementation details
- added to codepath tree (check version before install)
- added to test coverage table
- updated notes to reflect version check

## residual deferrals

none.

## verification

the blueprint now covers all vision requirements:

| vision requirement | blueprint coverage |
|--------------------|-------------------|
| default upgrade (rhx) → global + local | yes: detectInvocationMethod defaults to 'both' |
| default upgrade (npx) → local only | yes: detectInvocationMethod defaults to 'local' |
| --which flag for explicit control | yes: invokeUpgrade.ts adds --which option |
| global failure → warn, don't block | yes: execNpmInstallGlobal returns hint |
| already current → no network call | yes: getGlobalRhachetVersion checks first |
| output shows what happened | yes: output format section covers all cases |

## conclusion

zero deferrals. all vision requirements are covered in the blueprint.
