# self-review: has-consistent-mechanisms

## mechanism.1 = keyrack get spawn pattern in jest.*.env.ts

| question | answer |
|----------|--------|
| does codebase already have this? | no — this is the first use of keyrack get in jest env files |
| does it duplicate extant utility? | no — uses standard node:child_process execSync |
| could we reuse extant component? | no — this is the prescribed approach per vision |

**holds**: the keyrack get spawn is the new pattern that replaces the legacy use.apikeys.json read. no duplication.

## mechanism.2 = ConstraintError throw pattern

| question | answer |
|----------|--------|
| does codebase already have this? | yes — ConstraintError from helpful-errors is used elsewhere |
| does it duplicate extant utility? | no — uses the same ConstraintError class |
| could we reuse extant component? | yes — and we did |

**holds**: we reuse the extant ConstraintError pattern. the error message format follows vision guidance.

## mechanism.3 = getAllAvailableIdentities owner param

| question | answer |
|----------|--------|
| does codebase already have this? | the function exists; we extended it |
| does it duplicate extant utility? | no — it extends extant function with new fallback path |
| could we reuse extant component? | yes — we added to the extant function rather than create a new one |

**holds**: we extended the extant getAllAvailableIdentities function rather than create a new one. the owner-specific path check follows the same pattern as the standard paths check above it.

## mechanism.4 = JSON parse of keyrack response

| question | answer |
|----------|--------|
| does codebase already have this? | standard JSON.parse — universal |
| does it duplicate extant utility? | no |
| could we reuse extant component? | n/a — use standard library |

**holds**: standard JSON.parse, no custom mechanism needed.

## reflection

i reviewed the new code for potential duplication with extant mechanisms:

1. **keyrack get spawn** — new pattern prescribed by vision; no duplication
2. **ConstraintError** — reuses extant helpful-errors package
3. **getAllAvailableIdentities** — extended extant function rather than duplicate
4. **JSON parse** — standard library

the only new "mechanism" is the keyrack get spawn pattern itself, which is the core change requested. all other patterns reuse extant utilities.

**no issues found** — all mechanisms are either reused or prescribed as new by the vision.
