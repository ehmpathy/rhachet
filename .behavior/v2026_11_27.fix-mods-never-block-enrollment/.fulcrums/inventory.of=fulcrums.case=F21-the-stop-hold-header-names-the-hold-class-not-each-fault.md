# F21 — the stop hold's header names the class of the hold, never of each fault

- **fork**: the fault hold opens `├─ ✋ ConstraintError: N mods skipped, booted as published until cured`, and a branch below it may be `💥 MalfunctionError: the modded view record is unreadable` (C11).
  - raised by 5.3 peer `ergo-snapshot-visual-blemishes` nitpick.2, as a class mismatch.
  - The options:
    - (a) a neutral header with no class word; each branch keeps its own class
    - (b) keep the header on the class of the hold
- **taken**: (b).
  - The header names the hold, not a fault. The hold is the caller's to clear: the stop exits 2 under `ConstraintError: N mod faults, held until cured`, and every fault in it has a human cure, a corrupt record included (delete it, then `rhx init --roles +<repo>/<role>`, as `rhx mods.walk` path 4 shows).
  - Each branch names its own class through `asErrorHeadline`, so the true class of each fault stays on the line a reader acts on.
  - The drift hold and the budget hold on main open on the same class line, so (b) keeps one header shape across every stop hold; (a) would make the fault hold the one arm with no class word, against `rule.require.qualified-error-headers`.
- **rework**: clean. Drop the class word from the header line in `asRoleModFaultsHookReadout.ts`, then resnap its unit snap and the stop snaps in `enroll.mods.integration` and `roles.mods.acceptance`.
- **confidence**: 80%. A reader who weighs the per-line truth of the class word above one header shape across the holds would take (a).
- **where**: `src/domain.operations/mods/asRoleModFaultsHookReadout.ts`, the header line
- **raised by**: 5.3 peer review r6, nitpick.2
