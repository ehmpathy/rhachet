# F02 — the stop holds (exit 2) on a mod fault, the first stop of each turn

- **fork**: when a session stops with a mod fault present:
  - (a) hold the stop with exit 2, as the pin-drift arm does
  - (b) print a warn and exit 0
  - (c) hold the first stop of each turn, and let a stop claude already held (`stop_hook_active`) pass
- **taken**: (c).
  - The wish says pester "until it is cured", and #832's clamp asks the same of an orphan brief. A warn the brain can stop past does not pester.
  - (a) holds every re-fired stop too. A fault the brain cannot cure, such as an unreadable mods dir or one it may not edit, would loop the seat, and a loop is a block.
  - (c) still holds and names the fix at every turn's first stop, until the fault is cured.
  - The hook dispatcher already parses `stop_hook_active` and exports it to each rule as `RHACHET_HOOKS_STOP_HELD=1`. This follows the dispatcher's own convention for a refusal it cannot clear.
  - The bound covers only a stop held for faults alone. A budget breach or a pin drift beside the fault holds as it always has.
- **rework**: clean. The bound is one branch in `invokeRolesCostForHook` and one export in `bin/hooks.dispatch.sh`.
- **confidence**: 85%
- **where**: `src/contract/cli/invokeRolesCost.ts` (`invokeRolesCostForHook`), `bin/hooks.dispatch.sh`
- **revised by**: i004 r011 blocker.6 (enroll-impl-arch-defects): with (a), a fault the brain cannot cure had no bound on the stop loop
