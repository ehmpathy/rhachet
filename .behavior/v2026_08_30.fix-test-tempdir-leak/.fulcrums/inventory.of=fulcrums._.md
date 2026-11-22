# inventory.of=fulcrums — v2026_08_30.fix-test-tempdir-leak

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F001 | `createTestHomeWithSshKey` allocates at factory time | clean | settled — holds | 95% |
| F002 | the clamp removed its own leak-on-purpose dirs, beyond the granted count | clean | settled — a reclaim via test-fns' own teardown; the grant stays as given | 95% |
| F003 | arch-defects round 6: a tallied blocker with no body, and the teardown key | clean | settled — blocker.2 repaired; the teardown key holds | 95% |
| F004 | the snapshot masker reads the derived temp root, and refuses a foreign cwd | clean | settled — the lazy cache and its guard hold | 90% |
| F005 | the snapshot masker's root derivation is not a read outside the repo | clean | settled — no new exception owed | 90% |
| F006 | the ssh home fixture keeps its early release of the dir | clean | settled — a tested contract; the run's teardown stays the reclaim | 92% |

each entry: `inventory.of=fulcrums.case=F$n-$slug.md`. none is owed to a human: all six settled
by their own reasons, and none is a taste call or a dirty rework.
