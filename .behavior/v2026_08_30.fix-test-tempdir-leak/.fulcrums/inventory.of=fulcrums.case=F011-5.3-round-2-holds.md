# F011 — 5.3 round 2: main's test seams, and one claim that rests on a log the tool never emitted

## .the forks, and why each holds

1. **mech-external-contracts blocker.2, blocker.3, nitpick.1; mech-test-scope-purity blocker.1,
   nitpick.1, nitpick.2 — test seams in suites this branch touched.** the aws.params suite proves
   against a local SSM stand-in; the github-app suites put a stub `gh` on PATH; `promptHiddenInput`
   is module-mocked; an integration test swaps `console.log`. each is on `origin/main` line for line.
   this branch touched those suites only for a path mask and a test-key frame (F007). each seam is a
   choice about how main proves an external contract — out of the temp-dir behavior's bound. caught in
   `.dream/v2026_11_23.refactor.main-test-redundant-calls-and-tier-moves.md`
2. **repo-rules nitpick.2 — `genKeyrackRuntimeDir`'s `rk.<slug>` link outlives its run.** the link
   is main's fixture behavior; this branch only added the exempt marker beside the base it reads. a
   reclaim of the link is fixture work of its own, caught in the same dream
3. **repo-rules nitpick.1 — three near-identical probe files.** fulcrum F010 item 2: they are
   fixtures, and three files is the point — the clamp needs three test files across two workers,
   so a run allocates in parallel. one shared body would hide that the count is per file
4. **repo-rules nitpick.4 — the yield cites `git.repo.test` counts with no log path.** the rule
   binds where the tool emitted a path. `git.repo.test` emits none on a pass: its output reads
   `log — omitted on success by default`. each cited run passed, so no path was emitted to cite

## .rework

clean — each is local to its own suite or fixture.

## .confidence

90%.

## .verdict

settled by the driver, by reason. disputed, not conceded.
