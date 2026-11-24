# inventory.of=fulcrums — v2026_08_30.fix-test-tempdir-leak

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F001 | `createTestHomeWithSshKey` allocates at factory time | clean | settled — holds | 95% |
| F002 | the clamp removed its own leak-on-purpose dirs, beyond the granted count | clean | settled — a reclaim via test-fns' own teardown; the grant stays as given | 95% |
| F003 | arch-defects round 6: a tallied blocker with no body, and the teardown key | clean | settled — blocker.2 repaired; the teardown key holds | 95% |
| F004 | the snapshot masker reads the derived temp root, and refuses a foreign cwd | clean | settled — the lazy cache and its guard hold | 90% |
| F005 | the snapshot masker's root derivation is not a read outside the repo | clean | settled — no new exception owed | 90% |
| F006 | the ssh home fixture keeps its early release of the dir | clean | settled — a tested contract; the run's teardown stays the reclaim | 92% |
| F007 | a test key's frame is composed at runtime, so the secrets check stays strict | clean | settled — one fixture, `asTestKeyText`; bodies byte for byte | 88% |
| F008 | the four real-brain suites run behind the named live-brain gate | clean | settled — directed, and the repo's rule | 95% |
| F009 | main's test structure, in files touched only for the migration, stays as is | clean | settled — out of bound; caught as a dream | 92% |
| F010 | three 5.3 nitpicks held as they are (scan voice, probe frame, farm token) | clean | settled — each by reason | 90% |
| F011 | 5.3 round 2: main's test seams, and a claim on a log the tool never emitted | clean | settled — out of bound, and a fact | 90% |

each entry: `inventory.of=fulcrums.case=F$n-$slug.md`. none is owed to a human: all eleven settled
by their own reasons, and none is a taste call or a dirty rework.
