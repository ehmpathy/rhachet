# F29 — three probe skills stay manual instruments, with no test of their own

## .the fork

peer review 5.3 i002 r002 nitpick.3 and r010 nitpick.4: `bash.trap.inherit.probe.sh`,
`hooks.dispatch.bash32.probe.sh` and `hooks.dispatch.read.probe.sh` ship with no test.

- **(a)** give each an integration test of the branch the pr relies on
- **(b)** keep them as manual instruments, say so in the yield, and make sure each claim the yield
  cites from them holds a test of its own

## .taken

(b). each one reads a one-time fact under a host it needs: the host bash itself, docker with a bash
3.2 image, or GNU time under a 1 MB pipe. no dispatcher path calls one. a test of the first would
test bash; ci has no docker per test for the second; a timed read under test load would measure the
load for the third. the claims they back are tested directly: bash < 5 in `hooks.dispatch` [t16]
[t17] [t28] [t29], and the one-pass payload read in [t31], where a 1 MB payload reaches a rule byte
for byte.

## .rework

clean. three integration tests, no prod change.

## .confidence

85%. the bash 3.2 probe is the one whose fact could drift (a new bash construct in the dispatcher);
a ci job on a bash 3.2 image would hold it, and that is wider than this pr.

## .where

`.agent/repo=.this/role=any/skills/{bash.trap.inherit,hooks.dispatch.bash32,hooks.dispatch.read}.probe.sh`;
`5.3.verification.yield.md` `#### instruments that ship with no test`

## .verdict

open, for the director at the pr.
