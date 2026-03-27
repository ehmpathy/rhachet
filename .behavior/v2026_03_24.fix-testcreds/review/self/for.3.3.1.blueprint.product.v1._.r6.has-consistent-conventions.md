# self-review: has-consistent-conventions

## convention.1 = getAllAvailableIdentities function name

| question | answer |
|----------|--------|
| extant convention? | yes — function already exists with this name |
| do we diverge? | no — we extend it with same name |
| new terms introduced? | owner param is new but clear |

**holds**: we extend the extant function, keep its name. the `owner` param follows standard parameter patterns.

---

## convention.2 = owner parameter name

| question | answer |
|----------|--------|
| extant convention? | keyrack already uses `--owner` flag in CLI |
| do we diverge? | no — matches CLI convention |
| new terms introduced? | no — owner is extant term in keyrack domain |

**holds**: `owner` matches the keyrack CLI's `--owner` flag. consistent with extant domain terminology.

---

## convention.3 = ConstraintError usage

| question | answer |
|----------|--------|
| extant convention? | helpful-errors package provides ConstraintError |
| do we diverge? | no — standard usage pattern |
| new terms introduced? | no |

**holds**: ConstraintError is used per helpful-errors convention with `fix` metadata.

---

## convention.4 = variable name: requiredKeys

| question | answer |
|----------|--------|
| extant convention? | extant code uses `requiredKeys` in jest.*.env.ts |
| do we diverge? | no — same variable name |
| new terms introduced? | no |

**holds**: `requiredKeys` matches extant code in jest.integration.env.ts (line 98).

---

## convention.5 = variable name: keysAbsent

| question | answer |
|----------|--------|
| extant convention? | extant code uses `keysAbsent` in jest.*.env.ts |
| do we diverge? | no — same variable name |
| new terms introduced? | no |

**holds**: `keysAbsent` matches extant code in jest.integration.env.ts (line 99).

---

## convention.6 = comment format: .note =

| question | answer |
|----------|--------|
| extant convention? | ehmpathy uses `.note =` comment pattern |
| do we diverge? | no — blueprint shows `.note =` format |
| new terms introduced? | no |

**holds**: blueprint uses `.note =` comment format per ehmpathy convention.

---

## convention.7 = env var names

| question | answer |
|----------|--------|
| extant convention? | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY` from use.apikeys.json |
| do we diverge? | no — same env var names |
| new terms introduced? | no |

**holds**: env var names match extant use.apikeys.json configuration.

---

## convention.8 = keyrack CLI flag format

| question | answer |
|----------|--------|
| extant convention? | keyrack uses `--env`, `--owner`, `--json` flags |
| do we diverge? | no — blueprint command matches extant CLI |
| new terms introduced? | no |

**holds**: `rhx keyrack get --for repo --env test --json --owner ehmpath` matches extant keyrack CLI patterns.

---

## summary

| convention | verdict |
|------------|---------|
| getAllAvailableIdentities name | holds — extends extant |
| owner parameter | holds — matches CLI |
| ConstraintError usage | holds — standard pattern |
| requiredKeys variable | holds — matches extant |
| keysAbsent variable | holds — matches extant |
| .note = comment format | holds — ehmpathy convention |
| env var names | holds — matches extant |
| keyrack CLI flags | holds — matches extant |

**no divergence identified**. all names and patterns in the blueprint match extant conventions in the codebase.
