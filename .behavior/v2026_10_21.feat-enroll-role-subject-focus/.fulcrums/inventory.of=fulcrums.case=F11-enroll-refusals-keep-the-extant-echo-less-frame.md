# F11 — enroll's focus refusals keep the extant echo-less frame

- **the fork:** (a) the new focus refusals on enroll render through the extant `withCliOutputErrors`
  frame, which carries no `[args]` line; (b) give `withCliOutputErrors` the invocation echo in this
  pr, so every enroll refusal carries one
- **taken:** (a). the omission is extant on main and documented as a choice
  (`src/contract/cli/emitCliErrorAndExit.ts`: the wrapped path "does not want the line"). the focus
  feature adds refusals to a surface whose frame it does not own
- **why (b) is right and still deferred:** `rule.require.refusals-carry-context` names an echo-less
  refusal a blocker, so the extant frame is a defect. but (b) is dirty for this pr: the frame is
  shared by six verbs (enroll, actor list, clone list/say/get/whoami/prune), and ~40 extant refusal
  frames across five enroll suites alone (`enroll`, `enroll.reach`, `enroll.shared-brain-auth`,
  `enroll-to-reach.journey`, `enroll.focus`) would re-snap, some of them real-brain journeys. it is a
  renderer change with its own contract review, never a ride-along on a focus feature
- **the byte-identical rows:** `enroll.focus` [case4][t2] (`--roles mechanic:flow`) and [t3]
  (`+mechanic:flow`) reach the SAME refusal by design — [t3] exists to prove the bare-delta alias
  routes through the one parser. each carries a positive clamp on that refusal's own sentence, so
  neither row reads green off an earlier guard
- **rework:** dirty — a shared renderer and ~40 extant snapshots outside this wish
- **confidence:** 70%. the rule is clear; the bet is that a dedicated pr lands the echo across all
  six verbs at once, so enroll never splits from its five siblings
- **where:** 5.3 i001 r001 blocker.1 · `.dream/2026_10_23.fix.wrapped-cli-refusals-carry-the-invocation-echo.dream.md`
- **verdict:** (b), ruled by the director 2026-10-23. landed in this pr:
  `withCliOutputErrors` takes `args`, read by `getCliInvocationArgs` off the root program's parsed
  argv (the `-role` sentinel decoded); both renderers print the line through one owner,
  `asCliArgsEchoLine`; all six verbs pass it; json output stays echo-free. the dream is resolved
