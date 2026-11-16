# F9 — `use` writes no plan label for the target account

## .the fork

the grove's `claudeAiOauth` block carries `subscriptionType` (and, on some boxes, `rateLimitTier`).
`use` installs a minted token for the target, and the mint reply names no plan. three readings:

- **A** — write `subscriptionType: null`; claude-code reads the plan from its own profile call
- **B** — keep the prior account's label (the shape before this fix)
- **C** — probe the target's plan from the profile reply and write it

## .taken, why

**A**. B labels the target with the prior account's plan, which is false whenever the two seats
differ (pro vs max). C needs a read of a profile reply field that no seat has yet confirmed (F6).
null is the honest value: absent, not wrong.

## .rework

clean: one field in `setBrainAuthAccountInUseAtGrove`, plus a profile field read if C wins.

## .confidence — 70%, why not higher

unprobed whether claude-code tolerates a null `subscriptionType` without a re-login prompt, or
whether it reads the plan from the block alone. the F6 run against two real seats settles it.

## .where

- `src/domain.operations/brain/auth/account/setBrainAuthAccountInUseAtGrove.ts`
- `src/domain.operations/brain/auth/account/claude/asClaudeGroveCredentialsSwapped.ts`

## .verdict

open.
