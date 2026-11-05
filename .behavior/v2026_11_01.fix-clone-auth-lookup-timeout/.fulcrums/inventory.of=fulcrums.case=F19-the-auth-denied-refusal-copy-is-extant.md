# F19 — the `auth-denied` refusal copy and class are extant, and stay

- **fork**: the cross-user refusal reads `💥 MalfunctionError: clone refused the message: the caller
  is not the same unix user …`. a reviewer notes a second colon in the header, and that the
  server-fault class (`💥`, exit 1) points the fix at the system while the copy points it at the
  caller. reclass and reword it here, or leave it
- **taken**: leave it. both the copy (`CLONE_OPERATIONAL_REJECT_COPY['auth-denied']`) and its class
  (`computeCloneOperationalRejectClass.ts`) predate this PR, which changes neither; the vision cites
  both as the extant render. the header is stderr, which `rule.forbid.colons-in-stdout` leaves to
  `rule.require.qualified-error-headers`. a reclass to `ConstraintError` moves the exit code a
  machine caller branches on, a contract change for its own PR
- **rework**: dirty. an exit-code change on a shared reject class
- **confidence**: 80%
- **where**: `src/domain.operations/clone/socket/computeCloneOperationalRejectClass.ts`
- **verdict**: open. disputed against `5.3 i004 r11 nitpick.3`
