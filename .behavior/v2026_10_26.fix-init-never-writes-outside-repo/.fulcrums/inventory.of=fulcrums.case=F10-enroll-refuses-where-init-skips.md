# F10 — enroll refuses where init skips

## .the fork
the guard sits at the shared leaf writers, so `rhx enroll` meets it too, for an actor whose brain
dir lands outside the repo. two answers:
- A: refuse loud — `✋ ConstraintError: refused a write outside the repo`, exit 2, no clone
- B: skip as init does — a `⚠️` warn, exit 0, and spawn the clone

## .taken
A. init walks many brain dirs, so a skip lets the rest proceed and names the one it left. enroll
renders one brain dir and then spawns a clone that reads it. a skip there spawns a clone with no
boot and no role hooks, under a warn that scrolls past as the clone's tui opens. a refusal names
the path and the fix, and costs a rerun. the actors root is guarded before the legacy dir move
and its lock dir, and the brain dir before its `mkdir`, so a refusal leaves the outside tree
byte-identical (acceptance case2, with a legacy dir in the outside root).

## .rework
clean — the refusal is one guard call and one `catch` site in `invokeEnroll.ts`. to skip instead
is a `withBrainDirOutsideRepoAsSkip` wrap around the render and a warn; no contract moves.

## .confidence
88%. the wish names init alone; enroll's answer is inferred from the wish's "never writes outside
the repo" and from the hazard of a clone that runs without its guards. the wisher may prefer one
answer for every command.

## .where
`src/contract/cli/invokeEnroll.ts` · `blackbox/cli/enroll.outside-repo.acceptance.test.ts` ·
`1.vision.experience.case=_.md` slice 0
