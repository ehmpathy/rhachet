# self-review: has-behavior-declaration-coverage (revision 7)

## stone
3.3.1.blueprint.product.v1

## review context
r6 articulated coverage. this revision confirms after mech name refinement.

## wish coverage confirmed

all 6 wish requirements have blueprint coverage:

1. `set --vault os.daemon` → os.daemon codepath with skip manifest
2. `set --vault 1password` → 1password codepath with exid prompt
3. verify op cli setup → isOpCliInstalled(), exit 2
4. store exid in manifest → write host manifest
5. unlock pulls from 1password → vaultAdapter1Password.get() → daemonAccessUnlock()
6. get from daemon → retained behavior

## criteria coverage confirmed

| usecase | status | notes |
|---------|--------|-------|
| 1: os.daemon ephemeral | ✓ covered | prompt, daemon storage, mech, expiry |
| 2: 1password source of truth | ✓ covered | exid prompt, roundtrip, manifest |
| 3: ci service accounts | ✓ implicit | op cli handles OP_SERVICE_ACCOUNT_TOKEN |
| 4: op cli not installed | ✓ covered | failfast exit 2, instructions |
| 5: op cli not authenticated | ✓ implicit | roundtrip validation catches |
| 6: invalid exid | ✓ covered | roundtrip validation, error message |

## mech names confirmed

per user feedback, final mech names:
- os.daemon: `EPHEMERAL_VIA_REPLICA` (extant)
- 1password: `PERMANENT_VIA_REFERENCE` (new)

## verdict

no gaps found. all wish requirements and criteria are covered by the blueprint. implicit coverage for ci service accounts and auth errors is acceptable — op cli handles these cases natively.
