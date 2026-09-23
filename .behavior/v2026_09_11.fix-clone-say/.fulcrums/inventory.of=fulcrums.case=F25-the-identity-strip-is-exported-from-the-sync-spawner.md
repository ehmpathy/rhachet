# F25 — `asEnvWithoutCloneIdentity` is EXPORTED from `invokeRhachetCliBinary.ts`, over a peer module both spawners import

**rework** clean · **status** OPEN · **confidence** 84%

## .the fork, stated fairly

two test-infra spawners must strip the runner's clone identity before they merge `process.env`:

- `blackbox/.test/infra/invokeRhachetCliBinary.ts` — `spawnSync`, two merge sites
- `blackbox/.test/infra/spawnRhachetCliBackground.ts` — a real outer pty, one merge site

| option | cost |
|---|---|
| **A** — export the helper from `invokeRhachetCliBinary.ts`; the pty spawner imports it | a peer module imports from a file whose NAME promises a CLI invoker, so the helper's home does not advertise that it is shared |
| **B** — extract to a peer module (`asEnvWithoutCloneIdentity.ts`) both spawners import | a third file for a 4-line destructure, at two owners |

## .taken, and why

**A.** `rule.prefer.wet-over-dry` puts the extract trigger at three usages; this has three call sites
across **two owners**, and the helper is 4 lines of destructure with no branch. the export also keeps
the docblock that explains WHY the strip exists adjacent to the two sites that first needed it, over
splitting the rationale from its first consumer.

the added docblock note names the pty spawner explicitly, so a reader of `invokeRhachetCliBinary.ts`
learns the helper is shared and why the second consumer's leak is a different var.

## .rework, and why

**clean** — B is a file move plus two import rewrites. the helper's signature does not change, no
caller semantics are touched, and no contract reaches the wire. no code hardens against the helper's
location, so a later extraction costs one `git mv` and two lines.

## .confidence 84%, and why it is low

a reviewer can reasonably object on two grounds:

1. **the name lies about the scope.** `invokeRhachetCliBinary.ts` reads as one spawner's module; a
   second spawner importing from it inverts the dependency a reader expects.
2. **the rule-of-three may already be met.** `genBrainCliPlainClone.ts` carries its own note naming
   `genCloneChildEnv` as the owed extraction for the PROD side of the same concern. if a reviewer reads
   the prod and test halves as one family, the trigger is met today and B is owed now.

both are real. A is defensible because the prod extraction is a different seam (it WRITES an identity;
this STRIPS one) and because the rework is a move, never a rewrite.

## .where

- `blackbox/.test/infra/invokeRhachetCliBinary.ts:201` — the exported helper and its docblock note
- `blackbox/.test/infra/spawnRhachetCliBackground.ts` — the import and the third merge site
- `src/domain.operations/clone/pty/genBrainCliPlainClone.ts` — the prod-side `genCloneChildEnv` note

## .the demos that RENDER this call

NONE. no `case=N` demo reaches test infrastructure; the helper's placement is invisible to every
vision demo. a verdict here changes no demo.

## .the verdict

unruled.
