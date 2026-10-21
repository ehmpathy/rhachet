# F11 — the leaf refusal keeps each door's extant error frame

**the fork:** (a) the leaf refusal renders through whichever frame its door already uses: the
enroll door through `withCliOutputErrors` (no `[args]` trailer), the repl doors `rhachet ask` /
`rhachet act` through the top-level `emitCliErrorAndExit` (an `[args]` trailer) · (b) unify the
two frames, so every refusal carries the trailer, or none does.

**taken:** (a). this pr changes the refusal's words, not a frame; it adds no render path.

- the two frames predate this pr and each records its choice:
  `src/contract/cli/emitCliErrorAndExit.ts:25` — *"the `[args]` trailer is this handler's own
  context. the wrapped path (`withCliOutputErrors`) knows its args from its own invoker"*
- the divergence is repo-wide, not this refusal's: every unclassified throw from `ask`, `act`,
  `repo compile` and the `invoke` entry carries `[args]` (`invoke.unclassifiedThrow.integration`,
  `invokeRepoCompile.integration` snapshots), and the keyrack commands moved off it one at a time
- (b) is a render-policy change for every cli error: it resnaps each of those suites and reverses
  a choice the code records. that is its own decision, owned by whoever owns `asCliErrorFrame`
- the refusal a reviewer reads is complete in both frames: the message, the hint, `via` and `why`.
  the trailer adds the invocation, which a reviewer already holds

**rework:** clean for this refusal — it inherits (b) for free once the frames are unified.

**confidence:** 75%. `rule.forbid.snapshot-visual-blemishes` asks for one format across similar
outputs; whether a one-refusal unification outranks the recorded frame choice is the council's call.

**where:** `src/contract/cli/emitCliErrorAndExit.ts`, `src/contract/cli/asCliErrorFrame.ts`,
`blackbox/cli/__snapshots__/askAct.spawnDepth.acceptance.test.ts.snap`.

**verdict:** —
