# self-review: has-consistent-conventions (revision 6)

## stone
3.3.1.blueprint.product.v1

## context
r5 found convention violation: `EPHEMERAL_SESSION` did not follow extant `{DURATION}_VIA_{METHOD}` pattern. this revision confirms the fix.

## fix applied

renamed `EPHEMERAL_SESSION` → `EPHEMERAL_VIA_SESSION` in:
- 3.3.1.blueprint.product.v1.i1.md (4 occurrences)
- 1.vision.md (1 occurrence)
- 2.1.criteria.blackbox.md (2 occurrences)

## verification

| name | follows convention? |
|------|---------------------|
| EPHEMERAL_VIA_SESSION | yes — `{DURATION}_VIA_{METHOD}` |
| PERMANENT_VIA_EXID | yes — `{DURATION}_VIA_{METHOD}` |
| isOpCliInstalled | yes — `is{Tool}Installed` |
| vaultAdapterOsDaemon.ts | yes — extant file |
| vaultAdapter1Password.ts | yes — extant file |

## verdict

fix verified. all names now follow extant conventions.
