# review: has-pruned-backcompat

## summary

no backwards compatibility shims added. memory says "zero backcompat".

## changes analyzed

| change | backwards compat concern? |
|--------|---------------------------|
| KeyrackKeySpec.mech nullable | no - widened type, old callers still work |
| hydrateKeyrackRepoManifest mech: null | no - behavior change is intentional |
| inferKeyrackMechForSet uses promptLineInput | no - internal implementation |
| new promptLineInput.ts | no - additive |
| new mockPromptLineInput.ts | no - test infrastructure |

## memory guidance

from `feedback_zero_backcompat.md`:
> never add backwards compat, just delete

## verdict

**holds** - no backwards compat shims added. behavior change (mech null) is the goal, not a compat break to protect against.
