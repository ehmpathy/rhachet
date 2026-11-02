# F8 — the fence reads jest's own testPath, never a path the caller passes

## .the fork

the runtime fence must know which suite calls `getRealClaudeOrThrow` / `getCachedClaudeCliBin`, so
it can check that suite against the smoketest registry.

| option | what it reads | the cost |
|---|---|---|
| A. jest's record of the caller, `expect.getState().testPath`, read inside the harness | a value the suite does not write | the harness reads framework state; a call before jest sets it reads `undefined` |
| B. an explicit `testPath` input on every real-reach harness call | whatever the caller passes | the caller can pass any path — a registered smoketest's path included — so the fence asks the suite to vouch for itself |

## .taken

A. the fence exists to stop a suite that should not reach real claude. under B, the suite under
check supplies the very fact the check rests on: a copied `testPath: 'blackbox/cli/clone.realbrain…'`
passes the fence from any file, and no reviewer sees it as a reach. under A, the identity comes from
the test runner, which the suite does not control.

the ambient read is kept to one line in the harness; `assertRealClaudeReachAllowed({ testPath })`
itself stays a pure function of its input, unit-tested with explicit paths. the one hazard of A — a
read before jest sets the value — fails closed: an absent testPath is refused, loud, never let
through, so a wrong guess shows on the first run and never as a quiet pass.

## .rework

clean — B is a signature change on two harness functions and their callers; the pure fence does not
change.

## .confidence

85%. it rests on jest's `expect.getState().testPath` set inside test and hook bodies, which the jest
docs and the repo's own suites rely on; a call at module scope is the one place it is unset, and
that case is refused by design. 5.1's first shared-session run proves it either way (the assumption
row in the blueprint).

## .where

`3.3.1.blueprint.product.yield.md` — `.codepath tree`, runtime fence.

## .verdict

best-guessed.
