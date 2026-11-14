# F28 — the cross-surface vocabulary nitpicks wait for a dedicated pr

## .the fork

the 5.3 level-3 lanes (i004) raised ten nitpicks, all `[better]`. the reviewer of each one says the
point is about consistency, not a defect:

- **r11 enroll-verif-snapshot-blemishes**
  - n1: ✋ on a stray in an enroll that succeeds
  - n2: a failed init closes on a ✨ banner
  - n3: "shadow" in two senses, and zero counts
  - n4: one refusal, two render shapes
  - n5: drift vocabulary
  - n6: sweep vs boot tokens, which predates the branch
  - n7: two adjacent sweep notes
- **r12 enroll-verif-test-intent**
  - n1: `expandRoleSupplierSlugs` has no orchestrator test
  - n2: three `console.log` spies lost `mockImplementation`
  - n3: the `importEsmSafe` probe filter and the keyrack runtime dir

two options:
- **a.** fix each one in #702
- **b.** dispute each one here, with a reason, and catch the surface-wide items as a dream

## .taken — b, and why

- **cross-surface items (r11 n2, n4, n5, n6).** each spans the `init`, `upgrade`, `roles boot`,
  `enroll` and `run` renders, most of which predate this branch.
  - r11 n6 is reproduced in that lane with no mod at all (196 vs 440).
  - a fix in #702 would reword surfaces this pr never opened and move snapshots unrelated to mods.
  - that fails the CLEAN question of `rule.always.fix-forward-under-scouts-honor`.
- **items the code already answers (r11 n1, n3, n7).**
  - n1: the stray refusal is the mod-tree check, and it names the entry it refuses. The enroll
    succeeds because a stray holds no role, which is the requirement (inventory case=20, "the mods
    dir is no supplier").
  - n3: the tally counts every shadow, and the `[~]` row names only the shadow that dropped a
    `.min`. Both are stated in the vision's notice contract.
  - n7: the two notes count two different things, the linked spec and the mod's own files.
- **r12 n1.**
  - `asRoleSupplierExpansion` is the pure core, and it keeps every one of the 8 old expectations.
  - the orchestrator's composition, the `*` read of installed packages among it, runs end to end in
    `upgrade.acceptance` with `--roles *` and `ehmpathy/*`.
  - the old test proved that composition with mocks, which `rule.forbid.unit.remote-boundaries`
    forbids.
- **r12 n2.** a spy that swallows output is a mock implementation, and the brief says "can spy,
  never mock". the spies still observe, and no assertion changed.
- **r12 n3.** both items are host-portability repairs, recorded in the 5.3 yield's host-node notes.
  - the reviewer finds the keyrack edit keeps the same isolation intent.
  - the probe filter was reverted at i005 (r012 blocker.1), so the probe is as main ships it.

## .rework

**clean.** each item is a text or test-shape change that touches no contract a caller holds.

## .risk

**low.** every item is `[better]`, and no reviewer names a shipped harm.

## .confidence

80%. it is low on r11 n2 (✨ then ✗ on a failed init): a human may read it as a success. the
mitigation is that the exit code is 2 and stderr names the failure.

## .where

`blackbox/cli/__snapshots__/{roles,init,enroll,upgrade}.mods.*.snap`, `src/contract/cli/invokeInit.ts`,
`src/domain.operations/mods/asRoleModNoticeLines.ts`.
