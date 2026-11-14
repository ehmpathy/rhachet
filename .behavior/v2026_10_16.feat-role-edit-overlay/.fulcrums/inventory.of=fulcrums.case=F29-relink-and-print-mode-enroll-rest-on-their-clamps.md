# F29 — `roles link` and a print-mode `enroll` over a mod rest on their clamps

## .the fork

the 5.3 `enroll-verif-snapshot-coverage` lane (i005) asked for two more binary journeys, both
`[nitpick][better]`:

- **n1** `rhx roles link --repo test --role surfer` over a modded role, driven through the binary
- **n2** `rhx enroll claude -p …` (print mode) with a changed mod, to prove the mods readout stays
  off a json stdout

two options:
- **a.** add both journeys in #702
- **b.** rest each one on the clamps that already hold it

## .taken — b, and why

- **n1, relink.**
  - `invokeRolesLink` takes the role-view lock and re-renders. the re-render is the same
    `syncRoleModdedViews` call that `init` makes through the binary in every `roles.mods` case.
  - the relink order itself (link, then re-render, under the lock) is clamped at operation level in
    `syncRoleModdedViews.integration` `[case8]`.
  - a binary journey would drive the same two calls a second time.
- **n2, print mode.**
  - the readout is written by one `console.error` in `invokeEnroll`. stdout carries only the
    brain's own output.
  - `enroll.mods` `[case2]` `[case5]` `[case6]` now snap `{ stdout, stderr }` apart, and each holds
    the readout on stderr only. a leak to stdout would move those snaps.
  - print mode changes the brain argv, not the stream the readout takes.

## .rework

**clean.** each is one more `given` in an extant suite, with no contract change.

## .risk

**low.** both are `[better]`. the lane names no shipped harm.

## .confidence

85%. it is low on n2: a future edit that routes the readout by mode would escape the snaps above.

## .where

`blackbox/cli/roles.link.acceptance.test.ts`, `blackbox/cli/enroll.mods.integration.test.ts`.
