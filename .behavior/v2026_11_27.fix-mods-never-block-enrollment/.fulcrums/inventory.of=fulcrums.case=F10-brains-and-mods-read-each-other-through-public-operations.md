# F10 — brains and mods read each other, each through one public operation

- **fork**: two reads cross the brains/mods seam. brains asks whether the repo holds mods, to arm the stop sweep (`getAllRepoThisRolesWithHooks` → `mods/getAllRoleModEntries`). mods asks which skills a role's hooks invoke, so a `not` never removes one (`getAllRoleModHookCommands` → lazy `brains/getAllHookCommandsForRole`). (a) keep both edges, each a named public operation, the mods→brains edge lazy · (b) lift the hook-command read into `role/`, so mods no longer reaches brains · (c) inject the hook reader into the mods context
- **taken**: (a). each edge reads one fact the other context owns: `.agent/repo=.mods` belongs to mods, a role's hook commands belong to brains. neither mutates the other, neither imports an intern, and the mods→brains edge is lazy, so a mod-free run never loads brains. (b) moves a brains reader every hook sync calls into another context, to serve one validation; (c) threads a reader through every caller of the fault census for the same one check
- **rework**: clean — (b) or (c) each lands in one change with no contract shift: the reader moves or is injected, its callers rename one import
- **confidence**: 75%. a reader who holds directional deps as a hard rule would prefer (b)
- **where**: `src/domain.operations/brains/getAllRepoThisRolesWithHooks.ts`, `src/domain.operations/mods/getAllRoleModHookCommands.ts`
- **raised by**: i003 r005 nitpick.1 (arch-smell-scopeleaks), graded nitpick by the reviewer, who left it to close as a deliberate tradeoff
