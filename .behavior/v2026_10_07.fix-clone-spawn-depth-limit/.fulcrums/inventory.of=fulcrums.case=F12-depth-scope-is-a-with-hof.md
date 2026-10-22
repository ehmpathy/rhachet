# F12 — the depth scope takes its call positionally, as a `with*` wrapper

**the fork:** (a) `withCloneSpawnDepthScope(logic)` — one positional function, the shape of every
`with*` wrapper here · (b) `withCloneSpawnDepthScope({ logic })` — a named input object.

**taken:** (a). a `with*` wrapper is a higher-order function whose one argument IS the call it
wraps: `withLogTrail(_sendInvoice)`, `withRetry(_fn, { maxAttempts })`
(`rule.require.hook-wrapper-pattern`). `rule.require.get-set-gen-verbs` exempts the `with*`
prefix as an HOF wrapper, and `rule.forbid.positional-args` targets several positionals whose
order a caller must recall — one argument has no order to recall. (b) would make this the one
`with*` in the repo a reader must call differently from its peers.

**rework:** clean — two call sites in `asBrainReplWithContextBound.ts` and seven in its test.

**confidence:** 85%.

**where:** `src/domain.operations/spawn/withCloneSpawnDepthScope.ts:99`.

**verdict:** —
