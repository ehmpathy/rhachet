# F11 — a mod fault stays the error class it is raised as; its readouts read its metadata through two readers

- **fork**: each fault reaches five readouts: a refusal, a stray entry, an unreadable mods path, a corrupt record, or an orphan view.
  - (a) keep each fault as the `ConstraintError` or `MalfunctionError` it is raised as. The label and the fix are read from its metadata by `asRoleModFaultLabel` and `asRoleModFaultFix`.
  - (b) mint a `RoleModFault` discriminated union `{ kind, subject, headline, fix }` at each source, and have every readout switch on `kind` exhaustively.
- **taken**: (a).
  - Each fault is an error class the repo already uses (`rule.require.failloud`, `rule.require.qualified-error-headers`). The readout prints its class header, and the exit code follows from that class.
  - The two readers are the only place the metadata is read, and all five readouts go through them.
  - A fault with no `fix` key still prints its class and headline under `role=<slug>`, and `asRoleModFaultFix` returns null. So an unknown sixth kind prints a line with no fix hint. It is never silent.
  - (b) is a sound shape. But it adds a second fault vocabulary beside the error classes, and it touches every raise site in the mods domain. This route's wish is the gate, not a redesign of the fault type.
- **rework**: clean. (b) adds one domain object, plus one mapper at the two readers. The five readouts already read only the label and the fix, so none of them changes shape.
- **confidence**: 75%. A reader who wants the compiler to catch a new fault kind will prefer (b), and that is a fair trade.
- **where**: `src/domain.operations/mods/asRoleModFaultLabel.ts`, `src/domain.operations/mods/asRoleModFaultFix.ts`
- **raised by**: i004 r011 blocker.1 (enroll-impl-arch-defects)
