# F30 — the stub census and the parent-loss clamp read `/proc`, as the foreman ordered

- **fork** — the 5.3 i003 repo-rules lane (blocker.1) grades the `/proc` reads in
  `test.stubs.count.sh` and `stubBrainCli.parentLoss.integration.test.ts` against
  `rule.forbid.reads-outside-the-repo`. (a) move both observations to a channel the test owns ·
  (b) keep the `/proc` reads
- **taken** — (b).
  - the rule's own escape for a host read it cannot avoid is to ask, not to read. this was asked:
    the foreman ordered the check by name — a committed skill under
    `.agent/repo=.this/role=any/skills/` that reads `/proc/*/cmdline`, run after every test run,
    which must read 0
  - the census exists to count stubs the run did NOT record — a stub whose host died is exactly
    the one no scene captured. a census scoped to recorded pids would read 0 on the very leak it
    guards, which defeats the order
  - the clamp asserts that a process the test spawned is gone. a zombie keeps its pid handle and
    its exit event can lag the reap, so the stat state (`Z`) is the one fact that parts "exited"
    from "alive" — the pty or socket handle cannot see a stub whose stdin the test holds
  - both reads are read only, of processes this run spawned or the leak it hunts; neither gates a
    run on host capacity, the class the rule's examples name
- **rework** — clean — the skill and the clamp are two new files; a swap to a recorded-pid
  channel touches no other code
- **confidence** — 80%; the commander may want the rule amended with a named exception for a
  leak census, rather than a per-change dispute
- **where** — `.agent/repo=.this/role=any/skills/test.stubs.count.sh`;
  `src/domain.operations/clone/pty/stubBrainCli.parentLoss.integration.test.ts`;
  `5.3.verification.yield.md` (the stub section)
- **verdict** — unruled
