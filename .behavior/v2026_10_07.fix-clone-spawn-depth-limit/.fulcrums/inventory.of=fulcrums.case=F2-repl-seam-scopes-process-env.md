# F2 — the repl seam scopes `process.env` for the supplier call

**the fork:** (a) set the child depth on `process.env` for the duration of each repl call at
`asBrainReplWithContextBound`, restored after the last concurrent call · (b) add an `env` field to
the BrainRepl supplier contract and require suppliers to pass it to their spawn · (c) only refuse,
never propagate.

**taken:** (a). suppliers (e.g. `rhachet-brains-anthropic` via claude-agent-sdk `query()`) read
`process.env` today; (b) needs every supplier to change before the marker propagates; (c)
leaves the depth-0 → depth-1 hop unmarked, which the wish forbids.

**rework:** dirty — once role packages rely on the marker, a move to (b) touches every supplier.

**confidence:** 75%. a process-wide mutation is visible to unrelated code that reads the env
mid-call (in one rhx process, mostly naught). a refcount keeps concurrent calls safe.

**where:** `src/domain.operations/brain/asBrainReplWithContextBound.ts`.

**verdict:** —
