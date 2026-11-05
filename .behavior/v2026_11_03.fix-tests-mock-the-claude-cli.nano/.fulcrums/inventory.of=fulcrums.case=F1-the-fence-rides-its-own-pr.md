# F1 — the fence rides its own pr

## .the fork

- (a) build the real-brain fence in #691: a smoketest registry, a refusal inside
  `genRealClaudeAccess`, a tripwire `claude` shim at the head of each jest worker's PATH, the six
  `clone.*.realbrain` suites folded into one shared haiku session, their mechanism cases and
  `enroll.shared-brain-auth` moved onto the mock cli
- (b) ship #691 as the fix and its tests; plan the fence as its own pr, with a title and a bounded
  diff, and keep the `case=10` clamp `owed` until it lands

## .taken

(b). the director held #691 to nano size: the fix and its tests. the fence touches the acceptance
harness, both jest configs, and every real-brain suite at once — the "dirty change that warrants its
own pr" that `rule.forbid.deferrals-short-of-a-dedicated-pr` names as its one exception. the plan is
not vague: `.dream/v2026_11_03.followup.fence-the-real-brain-to-the-smoketests.md` holds the pr title
and the bounded diff, drawn from the `4fe875c` blueprint.

the mechanism cases of the `clone.*.realbrain` suites ride the same pr, not this one: which case of
a real-tui suite stays real is the very call the fence's smoketest registry makes. moved ahead of the
registry, each move would be a guess the registry then re-decides; and the move needs the mock cli
to serve the pty path those suites drive, which is the same pr's work. the dedicated pr's bounded
diff names both.

## .rework

clean. the fence is additive; no line in #691 hardens against it. if the call goes to (a), the
dedicated pr's diff lands on this branch instead.

## .confidence

90%. the size argument is measured (the prior blueprint's filediff tree). the residue is whether a
reviewer reads a test-harness re-shape as a "core contract".

## .where

repo-rules lane, 5.1 i001 r001, blocker.1; i002 r001, blocker.1 (the mechanism cases); 5.3 i001
r001 b1, r003 n1; 5.3 i002 r001 b1.

## .verdict

bounded to (b) by the director's order of 2026-11-03 18:48Z: "#691 diff slimmed to the mock fix
and its tests". the order names no fence, but its bound excludes one, so the scope cut is the
human's, not self-granted. the fence pr's title and
bounded diff sit in the dream's `.the dedicated pr`.
