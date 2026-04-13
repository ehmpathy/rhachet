# review: has-pruned-yagni

## summary

blueprint prescribed 3 changes. i added 3 more to fix test failures.

## prescribed (in blueprint)

| file | change | status |
|------|--------|--------|
| KeyrackKeySpec.ts | mech nullable | done |
| hydrateKeyrackRepoManifest.ts | mech: null (3 places) | done |
| mechAdapterGithubApp.ts | tilde expansion | done |

## additional (not in blueprint)

| file | change | why |
|------|--------|-----|
| inferKeyrackMechForSet.ts | use promptLineInput | tests failed - raw readline not mockable |
| promptLineInput.ts | new mockable prompt | required for above |
| mockPromptLineInput.ts | test infrastructure | required for above |
| fillKeyrackKeys.integration.test.ts | use new mock | required for above |

## analysis

blueprint said "no new tests required". but tests failed:
- `inferKeyrackMechForSet` uses `readline.createInterface` directly
- test mock system (`genMockPromptHiddenInput`) only mocks `promptHiddenInput`
- mech selection prompt caused tests to hang (awaited input forever)

**options considered:**
1. skip/disable failed tests - forbidden (failhide)
2. accept raw readline in production code - tests would still hang
3. refactor to mockable prompt function - chosen

**conclusion:** additional changes were necessary to make tests pass. not YAGNI - required for correctness.

## verdict

**holds** - all changes serve the goal. no extras added "for future flexibility" or "while we're here".
