# F18 — the repl-door fitness test stays a text heuristic

**the fork:** (a) the fitness test reads module text: a prod module that names `BrainRepl` or `isBrainRepl` and calls `.ask(`/`.act(` must import a scope wrapper · (b) a type-aware walk (ts-morph or the compiler api) that follows every value typed as a repl to its call site.

**taken:** (a). the doors that matter are covered by construction or by a per-door unit, so the test guards the one shape left over: a module that holds a raw repl.
- a repl reached through a `ContextBrain` value is wrapped at bind time: `genContextBrain` hands every repl through `asBrainReplWithContextBound`, which wraps `ask`/`act` in the scope
- `actorAsk`, `actorAct` and the binder each have a unit that reds with the wrapper removed
- the test's allowlist carries a reason per entry, and a stale entry reds

**the gap (a) leaves:** a module that names a wrapper and also calls a raw `.ask(` passes. narrow, and named in the test's own note.

**rework:** clean. (b) would replace one test file, and no prod code depends on which form it takes.

**confidence:** 80%. low only because a type-aware walk would close the gap, at more tool than this pr's diff earns.

**where:** `src/domain.operations/brain/asBrainReplWithSpawnDepthScope.fitness.integration.test.ts`; raised as r011 i006 nitpick.8.

**status:** open — for the council.

**verdict:** —
