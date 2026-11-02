# F9 — a part-way `--roles` init with no `--hooks` still re-renders the boots

## .the fork
- **A (taken)**: on a part-way fault in absolute mode, re-render the boots whether or not `--hooks` was passed; sync hooks only under `--hooks`. the fault path then matches the clean path, which renders boots for any `--roles` run
- **B**: resync only under `--hooks` (the prior shape); a `--roles`-only fault leaves the last run's `boot.md`, which may name roles now unlinked

## .taken, and why at the time
raised by peer lane arch-hazards-behavior (i003 nitpick.1): the fault path and the clean path were gated on different conditions, so a `--roles`-only fault left a stale boot. A makes the two paths one rule; F2 still holds (hooks prune only under `--hooks`).

## .rework
clean — one guard line in `invokeInit.ts` and the `hooks` type of `syncBootsThenHooksAfterPartWayFault`.

## .confidence — 80%, and why it is not higher
the vision names the part-way case under `--hooks` (case 11); it does not say what a `--roles`-only fault owes the boot. A follows the clean path by analogy, never by a stated requirement.

## .where
`src/contract/cli/invokeInit.ts` (the absolute-mode `.catch`)

## .verdict
open — the commander's to rule.
