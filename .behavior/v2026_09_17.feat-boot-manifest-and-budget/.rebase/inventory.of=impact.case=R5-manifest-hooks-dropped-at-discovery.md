# R5 — `roles boot --manifest` hooks are dropped at discovery

**status:** 🔴 broken

## .what broke

`src/domain.operations/brains/getLinkedRolesWithHooks.ts:27` filters every onBoot hook that
`isRolesBootCommand` matches — `^\s*(npx\s+)?(\S*/)?rhachet\s+roles\s+boot\b`. its docblock: *"a role
boot hook is superseded by the brain dir boot.md."*

that holds for `roles boot --repo X --role Y`. it does **not** hold for `roles boot --manifest <path>`:
`boot.md` renders linked roles only, never a manifest. so a role that ships a route-scoped manifest
boot as an onBoot hook loses it silently at `init --hooks` — the payload never loads, and the gate
never runs.

## .the gate itself

still intact on a direct call (R2, once its conflict settles toward ours). `rhx roles boot` also
escapes the regex (a skill lookup), so a hook in that form survives — by accident, not contract.

## .fix shape

keep a hook whose command carries `--manifest`: extend `isRolesBootCommand` (or its caller) to
exempt it, plus a row in `isRolesBootCommand.test.ts`. clean — one predicate, one test file.
