# F21 — the clone-side auth trace lines are pinned by phrase, not by snapshot

- **fork**: the PR adds or renames five fault messages that the clone's owner reads as
  `clone socket auth error: ...`. snap each whole line, or pin the cause phrase with `toContain`
- **taken**: pin the phrase. a trace line is the clone owner's debug log. no caller parses it, and
  no human copies a command from it. the phrase is the part a reader searches for. the rest of the
  line holds a pid, a socket path and errno text, which change per host and would each need a mask
  to snap
- **rework**: clean. a snapshot per trace case is additive, in the tests only
- **confidence**: 80%. the repo snaps output a human reads, and a trace is read by a human, though
  only in a debug session
- **where**: `src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts`
- **verdict**: open. raised by `5.3 i005 r10 nitpick.2`
