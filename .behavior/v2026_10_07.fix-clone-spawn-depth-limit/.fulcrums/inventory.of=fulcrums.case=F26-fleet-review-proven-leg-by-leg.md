# F26 — the fleet peer review (case=6) is proven leg by leg, never as one chained walk

**the fork:** (a) prove each rhachet boundary of the walk in its own test — the `-p` leaf mint at
the enroll door ([t0]) and the leaf refusal at the repl door ([t1]) — and leave [t2] (the reviewer
writes its verdict from its own read) to the brain · (b) one acceptance test that drives a real
human-tty enroll → a session worker → a `-p` reviewer → its own `rhachet ask`, with real brains at
every hop.

**taken:** (a).

- every hop of the walk crosses one rhachet seam, and each seam has its test: the tty read
  (`enroll.reach.acceptance`), the work enroll and the `-p` leaf mint (`enroll.acceptance` reviewer
  leaf [case5]), and the repl refusal (`askAct.spawnDepth` [case1],
  `replDoorRealSupplier.realnode.integration` [t3]). the leaf mark each leg hands on is asserted by
  value at the next leg's input
- [t2] is the reviewer brain's choice of what to do after a refusal. rhachet emits the refusal and
  its hint; what a model then writes is no rhachet contract, so no rhachet test can clamp it
- (b) needs three live brains in a chain, each one waiting on the one below it. that makes the run
  slow and the outcome sampled, and it would assert no fact the per-leg tests do not already hold

**rework:** clean — a chained real-brain walk can be added beside the legs whenever a harness can
hold three live clones.

**confidence:** 80%. a chained walk would catch a defect in how the legs compose (for example, an
env key that one hop drops), which the per-leg tests catch only where each test asserts that key
at its own input.

**where:** `1.vision.experience.case=6.fleet-peer-review-end-to-end.md`.

**verdict:** —
