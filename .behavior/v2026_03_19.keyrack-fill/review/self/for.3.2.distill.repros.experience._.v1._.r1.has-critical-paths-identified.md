# self-review r1: has-critical-paths-identified

## verification: critical paths identified

### critical paths declared

1. **fill single owner** — `rhx keyrack fill --env test`
2. **fill multiple owners** — `--owner default --owner ehmpath`
3. **skip already set** — idempotent re-run

### pit of success verification

#### path 1: fill single owner

| aspect | check | notes |
|--------|-------|-------|
| narrower inputs | ✓ | `--env` is required; `--owner` defaults to `default` |
| convenient | ✓ | single command fills all keys; no adhoc command needed |
| expressive | ✓ | can add `--key` to filter, `--refresh` to overwrite |
| failsafes | ✓ | roundtrip verification catches misconfigurations |
| failfasts | ✓ | fail-fast on no prikey, empty value, key not found |
| idempotency | ✓ | skips already-set keys unless `--refresh` |

#### path 2: fill multiple owners

| aspect | check | notes |
|--------|-------|-------|
| narrower inputs | ✓ | repeat `--owner X --owner Y`; prikeys auto-discovered or supplied |
| convenient | ✓ | one command fills both personal and shared keyrack |
| expressive | ✓ | inner loop on owners groups prompts; user can enter different values per owner |
| failsafes | ✓ | partial success reported; user knows which owners succeeded |
| failfasts | ✓ | fail-fast if any owner's prikey unavailable |
| idempotency | ✓ | same as single owner |

#### path 3: skip already set

| aspect | check | notes |
|--------|-------|-------|
| narrower inputs | n/a | automatic detection |
| convenient | ✓ | no prompt for keys that are already configured |
| expressive | ✓ | `--refresh` overrides skip behavior |
| failsafes | ✓ | clear "already set, skip" message |
| failfasts | n/a | not an error condition |
| idempotency | ✓ | this IS the idempotency behavior |

---

## what if each critical path failed?

| path | failure mode | consequence | mitigation |
|------|--------------|-------------|------------|
| fill single owner | prikey unavailable | user cannot fill; blocked | fail-fast with hint to supply `--prikey` |
| fill single owner | roundtrip verification fails | user has key in vault but cannot access it | error message includes fix command |
| fill multiple owners | one owner's prikey absent | user can only fill for owners with prikeys | report which owners succeeded vs failed |
| skip already set | detection fails (false negative) | user prompted for key they already have | worst case: user re-enters same value |
| skip already set | detection fails (false positive) | user skips key they don't have | verification would catch: get after set fails |

---

## conclusion

all three critical paths pass pit of success checks:
- inputs are constrained and defaulted
- common case is frictionless (single command)
- error modes fail fast with clear messages
- idempotency is built in

no issues found. the critical paths hold.
