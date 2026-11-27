# F8 — a leak is a `ConstraintError`, as the vision drew it

## .the fork

a run that leaves a process alive turns red. its header may be `✋ ConstraintError` (the caller
must fix — here, the author of the test that spawned the child) or `💥 MalfunctionError` (the
system must fix). execution first shipped `MalfunctionError`; the approved vision's case 6 drew
`ConstraintError`.

## .taken, and why

`ConstraintError`, per the vision. the fix is always in the test that spawned the child — own
the child via `spawnRhachetCliBackground`, or end it in that test's `afterAll`. the harness and
the sweep are sound; the test author amends their test. that is the caller-fixes class
(`rule.require.qualified-error-headers`).

## .rework

clean — one header string and one error class in `asLeakReport.ts` and
`ReporterAcceptanceBox.ts`, plus their test assertions.

## .confidence — 85%, why not higher

a leak can also be a prod defect a test merely exposed (a prod spawn that does not end its
child), where the system fixes it. the report's fix branch names the test-side cure only.

## .where

`blackbox/.test/infra/asLeakReport.ts` (`asLeakReport`), `ReporterAcceptanceBox.ts`.

## .verdict

confirmed (director, 2026-11-16) — a leak is a `ConstraintError`.
