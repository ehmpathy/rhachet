# self-review: has-consistent-mechanisms (revision 5)

## stone
3.3.1.blueprint.product.v1

## context
r4 found one item: blueprint says `promptVisibleInput()` but extant pattern is `promptUser` inline helper. this revision confirms the resolution.

## resolution

the blueprint line `[+] promptVisibleInput() for exid` describes the behavior (visible prompt for exid), not a specific function name. at execution time, the implementation will:

1. copy the `promptUser` helper pattern from `setupAwsSsoWithGuide.ts`
2. use it inline in `vaultAdapter1Password.ts` for exid prompt

this follows how aws sso guided setup works — the `promptUser` helper is local to that file, not extracted to infra. the 1password adapter will follow the same pattern.

no blueprint change needed — the implementation will naturally adopt the extant pattern.

## verification

| mechanism | duplicates extant? | resolution |
|-----------|-------------------|------------|
| isOpCliInstalled.ts | no — new utility | ok |
| promptVisibleInput | pattern exists | reuse promptUser inline |
| vaultAdapterOsDaemon update | no — extends extant | ok |
| vaultAdapter1Password set() | no — extends extant | ok |
| genContextKeyrackGrantUnlock | no — extends map | ok |
| setKeyrackKey | no — extends conditionals | ok |

## verdict

no duplication. `promptUser` pattern will be reused inline at execution time. all mechanisms are consistent with extant patterns.