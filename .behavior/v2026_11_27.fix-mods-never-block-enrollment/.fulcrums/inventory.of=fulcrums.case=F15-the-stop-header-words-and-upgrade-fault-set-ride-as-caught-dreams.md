# F15 — the stop header's words and upgrade's fault set land in this diff

- **fork**: two readouts are true to their own surface but narrower than the stop.
  - The stop header said "booted as published until cured", which a stray (C0) or a mod of no linked role does not do.
  - `rhx upgrade` named only the faults its render refuses (it omitted C9, C10, the C11 orphan, C13), so it named fewer faults than the next stop.
  - The options:
    - (a) fix both in this diff
    - (b) defer both as caught dreams, each with the shape of its fix
- **taken**: (a).
  - Neither reshapes a contract: each is one readout and its snapshots. Under `rule.forbid.deferrals-short-of-a-dedicated-pr` that is work done now, never a dream.
  - The stop's class line reads `N mod faults, held at the first stop of each turn until cured`; the footer keeps only `ask your human before you delete a mod`, so no fact is said twice. It counts faults, never skipped mods: a stray (C0) or a file where the mods dir belongs (C13) skips no mod. The init and enroll readout keeps `skipped, booted as published until cured`, since that branch lists only the faults a role carries and names the unplaced ones apart.
  - `rhx upgrade` reads `getAllRoleModFaultsOfRepo`, the sweep the stop reads, and labels each fault where it lives (`asRoleModFaultLabel`). `getAllRoleModDriftsOfRepo` returns `{ drifts }` alone.
- **rework**: clean. A readout change plus its snapshots, with no contract shift.
- **confidence**: 90%.
- **verdict**: ruled (a), on 5.3 r1 blocker.1.
- **where**:
  - `src/domain.operations/mods/asRoleModFaultsHookReadout.ts`
  - `src/domain.operations/mods/asRoleModRefusalsUpgradeReadout.ts`, `src/contract/cli/invokeUpgrade.ts`
  - proof: `asRoleModRefusalsUpgradeReadout.test.ts` case2, `getAllRoleModDriftsOfRepo.integration.test.ts` case2 and case3, `upgrade.mods.acceptance.test.ts`
- **raised by**: i004 r010 points 5 and 6 (enroll-impl-behavior-intent); 5.3 r1 blocker.1 (repo-rules); 5.3 L3 r011 nitpick.1 (the noun: a fault, never a skipped mod); 5.3 L3 r011 round 2 nitpick.4 (the footer fold)
