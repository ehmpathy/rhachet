# F16 — the `clone say` refusal render carries no `[args]` echo

- **fork**: the new `clone.say.slowbox` failure snapshot locks a refusal with no invocation echo
  (`rule.require.refusals-carry-context`). add the echo to the `clone say` refusal here, or leave it
- **taken**: leave it in this PR. the omission is a deliberate choice in an extant, shared render.
  `emitCliErrorAndExit.ts` states: "the wrapped path (`withCliOutputErrors`) knows its args from
  its own invoker and does not want the line". every command with an `--output json` contract
  renders through that wrapped path. an echo there moves the stderr of every such command and
  every snapshot that locks one. this PR changes no line of that render; it only adds one more
  snapshot of it
- **rework**: dirty. a cross-command change to a shared refusal render
- **confidence**: 80%. the rule reads as if it binds this render too; whether the wrapped path's
  exemption should stand is a question for that render's owner
- **where**: `src/contract/cli/emitCliErrorAndExit.ts:25-26`, `withCliOutputErrors`
- **verdict**: open. disputed against `5.3 i001 r1 nitpick.2`
