# F6 — a `.claude` link that aims elsewhere is refused before the role loop, not deferred to the boot sync

- **fork:** (a) refuse it in the preflight, beside the case 2 write probe, before any role links; or
  (b) keep today's path: the layout step defers the refusal, the role inits run, the boot sync reports it
- **taken:** (a). under (b) a role init in such a tree writes through `.claude` into the place the link
  aims at — another worktree, or the main checkout — before init refuses. that is a behavioral harm
  with a name, and the case 2 probe already puts a gate at the exact spot (a) needs
- **why (b) is a real contender:** the deferral was deliberate (`setRepoActorBrainDirLayout.ts:63-72`,
  inventory case=8): a layout fault must not block the role links. (a) narrows that design for one
  fault class — a link that aims elsewhere — while a cache fault (E) stays deferred
- **rework:** clean — one more check in the preflight, and case 4's clamp moves from the boot sync to
  the preflight
- **confidence:** 65%. it changes when a refusal fires, so it is the commander's (seed S1)
- **where:** `1.vision.yield.md` → open question 9; case 4; the dimensions' gate order
- **verdict:** —
