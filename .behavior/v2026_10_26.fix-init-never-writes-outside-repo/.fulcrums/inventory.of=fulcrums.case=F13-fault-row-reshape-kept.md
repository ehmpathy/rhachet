# F13 — the fault row reshape is kept

## .the fork
two reviewers ask for opposite rows.

- **revert** (r12, test intent): an actor's fault row goes back to `✗ <exid>: <class>: <msg>` with a
  `hint:` child, the old exact assertions come back, and roles and path are added beside them. the
  colon and `=` repair rides with dream item 13
- **keep** (r6, snapshot blemishes, rounds i001–i003): the row is `✗ <exid>`, and its leaves are
  `error = …`, `roles = …`, `path = …`, `hint = …`. r6 blocked on the mixed form — a class and a
  message run on into the row by `:`, then key = value leaves beneath it

## .taken, and why at the time
keep. the wish makes every fault print with its actor, role, and path. each of the three is one
leaf here, so a human scans them by key. to add roles and path to the old run-on row stacks three
facts on one line, or splits them across a row and two unlabeled children, and r6 already blocked
that shape. the reshape touches only the fault row, the row this diff exists to change; the change
row's `<exid>: <changes>` stays, and dream item 13 reshapes it with the rest of the tree.

r12 does not call the reshape wrong. it calls it a changed contract, and leaves the choice to the
author. it is a changed contract, on purpose, and the old assertions it names were rewritten to
pin the new row exactly, never loosened (r12: "no assertion was loosened").

## .rework
clean — the revert is one render (`asEnrolledActorHookSyncRow`, `asEnrolledActorsHookSyncLines`)
plus the snapshots that pin it. no caller parses the row.

## .confidence
75%. two reviewers split, so the call is the wisher's; this is the best guess, held until ruled.

## .where
`src/domain.operations/init/hooks/asEnrolledActorHookSyncRow.ts` ·
`src/domain.operations/init/hooks/asEnrolledActorsHookSyncLines.ts` · their tests ·
`syncHooksForLinkedRoles.integration.test.ts` · `brain-dir-boot.journey.acceptance.test.ts.snap`.
