# F25 — the content hold reads no `stop_hook_active`, as the budget hold does not

- **fork**: release the hold when claude passes `stop_hook_active: true` (a stop already held once), so a clone that will not repair cannot loop; or hold on every stop, as the budget hold does
- **taken**: hold on every stop; the loop guard is a repo-wide stop policy, caught as a dream
- **why**: every held stop is followed by a stop with `stop_hook_active: true`, so a release there turns each hold into one nudge and then a warn. the vision drew the owned defect as a hold until repaired, the same contract as a budget breach. the budget hold has shipped on this shape with no read of the flag (`rhx grepsafe --pattern stop_hook_active --path src` → 0 matches). a content hold alone that released would make two holds in one sweep behave two ways. a leaf clone that must never repair is enrolled without the carrier role, and its receipt says so (`isCloneStopSweepArmed`)
- **counter (i006 r10)**: a hold the clone cannot or will not repair re-fires on every stop, and content holds reach more clones than budget holds
- **answer**: true for both holds; the fix is one policy for the sweep, not a fork in one hold. `.dream/v2026_11_21.feature.a-stop-sweep-loop-guard.md` holds its shape
- **rework**: clean. a read of the hook's stdin in `invokeRolesCostForHook`, one branch, no change to the readouts
- **confidence**: 70%
- **where**: peer review r10 blocker.2 (i006); yield `.deviations`
- **verdict**: open
