# F05 — `roles boot` and `roles cost` read the same tolerant gate

- **fork**: the hand-run `roles boot` / `roles cost` (a) keep their refusal and the `withheld` row · (b) render the role with its mod skipped and mark the row
- **taken**: (b). one gate for every render means the cost of a boot and the boot itself never disagree, which `getAllModdedRoleRefsUnbootable.ts:17` already demands ("the boot's own check decides")
- **rework**: clean — the uncosted readout shrinks to the stale case or vanishes
- **confidence**: 75%. neither command is on the enroll path; a reviewer may prefer to leave them
- **where**: `genBootPayload.ts:188`, `genRoleModsUncostedReadout`, `getAllModdedRoleRefsUnbootable.ts`
