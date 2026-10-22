# F10 — where the spawn depth limit lives, so both doors can share it

**the fork:** (a) the depth limit lives in `domain.operations/clone/`, and the brain door imports it
from there · (b) hoist it to `src/utils/` · (c) give it its own subdomain,
`domain.operations/spawn/`, which both doors depend on and which depends on neither.

**taken:** (c). the limit is shared by two spawn doors: the enroll door (`contract/cli/invokeEnroll`)
and the repl door (`domain.operations/brain/asBrainReplWithContextBound`). neither the clone
domain nor the brain domain owns it alone. the glossary had already drawn this seam:
`term=spawn.depth` and `term=spawn.door` both carry `term.boundary = spawn`. so the operations
now sit where their terms do:

- `src/domain.operations/spawn/asCloneSpawnDepth.ts`, `assertCloneSpawnDepthWithinLimit.ts`,
  `withCloneSpawnDepthScope.ts`, and their tests and snapshots
- `spawn/` imports only `@src/utils/cloneEnvKeys` and `helpful-errors`. it imports no domain
- the brain door imports `spawn/`, not `clone/`. the clone domain never imported these
  operations, so it has no edit
- `rhx grepsafe --pattern "domain.operations/clone" --path src/domain.operations/brain` returns
  0 rows

(a) was taken first, on the grounds that the edge was one-way and had a precedent
(`actor/enrolled/isActorActive.ts`). a reviewer held that a clean direction does not make a
reach-in a seam. once the term boundary was in view, (c) cost three file moves and two import
edits, and it removed the edge rather than defend it. (b) stays out: `src/utils/` holds no domain
knowledge (`rule.require.directional-deps`), and a depth limit with its refusal hint is domain
knowledge.

**rework:** clean. a move of three files and two imports either way.

**confidence:** 90%. whether a one-concept subdomain is worth a dir is a taste call. the boundary
name was already settled in the glossary, so this move follows the glossary rather than invent a
new seam.

**where:** `src/domain.operations/spawn/` · `src/domain.operations/brain/asBrainReplWithContextBound.ts:2`
· `src/contract/cli/invokeEnroll.ts:26-27`.

**verdict:** —
