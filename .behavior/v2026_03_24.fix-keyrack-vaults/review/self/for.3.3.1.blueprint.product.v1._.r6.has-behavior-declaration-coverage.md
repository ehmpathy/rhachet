# self-review: has-behavior-declaration-coverage (revision 6)

## stone
3.3.1.blueprint.product.v1

## wish coverage

| wish requirement | blueprint coverage |
|------------------|-------------------|
| `set --vault os.daemon` temporary storage | ✓ os.daemon codepath, skip manifest write |
| `set --vault 1password` leverage op cli | ✓ 1password codepath with exid prompt |
| verify 1password cli is setup | ✓ isOpCliInstalled(), exit 2 with instructions |
| store exid in host manifest | ✓ "write host manifest # stores vault=1password, exid" |
| unlock pulls from 1password to daemon | ✓ vaultAdapter1Password.get() → daemonAccessUnlock() |
| get pulls from daemon as usual | ✓ retained behavior (no changes needed) |

## criteria coverage

### usecase.1 = os.daemon: ephemeral key storage

| criterion | blueprint coverage |
|-----------|-------------------|
| prompt for secret via stdin | ✓ promptHiddenInput() |
| store in daemon memory only | ✓ daemonAccessUnlock(), skip manifest |
| display mech=EPHEMERAL_VIA_REPLICA | ✓ return mech=EPHEMERAL_VIA_REPLICA |
| display expiration time | ✓ outputResult() |
| get returns value from daemon | ✓ retained behavior |
| unlock reports "already unlocked" | ✓ detect already in daemon |

### usecase.2 = 1password: remote source of truth

| criterion | blueprint coverage |
|-----------|-------------------|
| prompt for 1password uri | ✓ promptVisibleInput() for exid |
| validate roundtrip via op read | ✓ validateRoundtrip() |
| store pointer in host manifest | ✓ write host manifest |
| display mech=PERMANENT_VIA_REFERENCE | ✓ return { exid } |
| unlock fetches from 1password | ✓ execOp(['read', exid]) |
| cache in daemon | ✓ daemonAccessUnlock() |

### usecase.3 = ci with service accounts

| criterion | blueprint coverage |
|-----------|-------------------|
| OP_SERVICE_ACCOUNT_TOKEN auth | implicit: op cli handles this |
| no human interaction | implicit: op read with token works |

note: no explicit blueprint changes needed — op cli natively supports service account tokens.

### usecase.4 = op cli not installed

| criterion | blueprint coverage |
|-----------|-------------------|
| display "op cli not found" | ✓ error messages section |
| display install instructions | ✓ ubuntu install steps |
| exit code 2 | ✓ constraint error |

### usecase.5 = op cli not authenticated

| criterion | blueprint coverage |
|-----------|-------------------|
| display authentication error | implicit: roundtrip validation fails |
| hint op signin | ✓ in error message "run: op whoami" |
| exit code 2 | ✓ constraint error |

note: handled implicitly by roundtrip validation — op read fails if not authenticated.

### usecase.6 = invalid exid

| criterion | blueprint coverage |
|-----------|-------------------|
| roundtrip validation fails | ✓ validateRoundtrip() |
| display error with exid | ✓ error messages section |
| exit code 2 | ✓ constraint error |

## boundary conditions

| condition | blueprint coverage |
|-----------|-------------------|
| key already exists → upsert | implicit: standard set semantics |
| no --env specified → fail fast | implicit: cli parse |
| daemon not active → auto-start | implicit: daemon sdk behavior |

## verdict

all wish requirements and criteria are covered. usecases 3 and 5 are handled implicitly by op cli behavior and roundtrip validation, not explicit blueprint changes.
