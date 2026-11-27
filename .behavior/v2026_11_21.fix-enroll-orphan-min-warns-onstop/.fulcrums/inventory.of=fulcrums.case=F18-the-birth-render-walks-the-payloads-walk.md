# F18 — the birth render walks with the payload's skip list

- **fork**: align the walks so the stop memo cannot miss a defect the birth finds: the birth render skips `node_modules`, `.git` and `dist` as `genBootPayload` and the fingerprint do, or the fingerprint walks every dir the birth walks
- **taken**: the birth render takes `BOOT_WALK_DIRS_SKIPPED`
- **why**: `roles boot` already renders with that skip list, so the birth now renders the same file set `roles boot` does. a fingerprint that walked `node_modules` would pay that walk on every stop. a brief under a role's `briefs/dist/` no longer reaches the birth corpus; no role ships one today, and `roles boot` never rendered it
- **rework**: clean. drop the option at `getOneRoleBootContent.ts`, and widen the fingerprint walk to match
- **confidence**: 85%
- **where**: peer review i004 r11 blocker (the memo is unsound under a skip-list mismatch)
- **verdict**: open
