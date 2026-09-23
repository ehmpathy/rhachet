# F27 — the hermeticity clamp MUTATES `process.env` on the jest runner, over a spawner seam that takes the runner identity as data

**rework** clean · **status** OPEN · **confidence** 90%

## .the fork, stated fairly

the defect-3 clamp must prove that a suite run **by a depth-1 clone** still enrolls a peer. the runner's
own identity is the input, so the test must make the runner look like a depth-1 clone.

| option | cost |
|---|---|
| **A** — `beforeAll` sets `process.env.RHACHET_CLONE_DEPTH = '1'`, `afterAll` restores the prior value | the test mutates global state on the jest worker; a parallel test in the same worker would observe it |
| **B** — give `spawnRhachetCliBackground` an input field that declares the runner identity, so the test passes it as data | the seam under test is precisely the `process.env` merge — a field that bypasses it clamps a different code path than the one the defect lived in |

## .taken, and why

**A.** the mutation **IS the instrument**. the defect was that the spawner read
`process.env.RHACHET_CLONE_DEPTH` and merged it raw; a clamp that hands the depth in through a new
input field would never exercise that read, so it would go green under the un-fixed defect — the exact
failure `rule.require.clamp-edge-cases` names as a clamp with no teeth.

the mutation is bounded: one var, `beforeAll`/`afterAll` paired, prior value captured and restored.
the `undefined` case is handled too — it `delete`s the key rather than assigns the string
`"undefined"`.

the dogfood confirmed the teeth: revert the strip → 🔴 2 failed, with `"depthRequested": 2,
"depthMax": 1` in the output — red for the right reason, not merely at the right time.

## .rework, and why

**clean** — B is a new optional input field plus a two-line change at the merge. it breaks no extant
caller. but it would also invalidate the clamp, so a rework here is a redesign of the test's premise
rather than a refactor of its mechanism.

## .confidence 90%, and why it is low

a reviewer can object that a test which mutates `process.env` is order-dependent by construction
(`rule.forbid.order-dependence`), and that jest's `--runInBand` is not guaranteed for every invocation.

the counter: the acceptance suite's spawners each strip this exact var before they merge, so a
concurrent test in the same worker is INSULATED from the mutation by the very cure this clamp guards.
the mutation is observable only by a test that reads `process.env.RHACHET_CLONE_DEPTH` directly, and
no such test exists.

the residual doubt is that this insulation is a property of the current cure, so a future spawner
added without the strip would silently couple to this clamp.

## .where

- `blackbox/cli/enroll.reach.acceptance.test.ts` — the clamp, its docblock mutation table, and the
  note that the runner-env mutation IS the instrument
- `blackbox/.test/infra/spawnRhachetCliBackground.ts` — the merge site the clamp exercises
- `blackbox/.test/infra/invokeRhachetCliBinary.ts:201` — the strip that insulates concurrent tests

## .the demos that RENDER this call

NONE. no `case=N` demo reaches test infrastructure. a verdict here changes no demo.

## .the verdict

unruled.
