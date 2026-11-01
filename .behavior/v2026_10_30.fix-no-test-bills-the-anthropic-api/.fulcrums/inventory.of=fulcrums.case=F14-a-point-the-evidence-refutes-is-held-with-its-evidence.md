# F14 — a peer point the evidence refutes is held, with that evidence

## .the fork
- (a) a point whose premise the repo disproves is disputed, with the file and line that disprove it
- (b) it is conceded, and a change made to quiet it

## .taken
(a). a change made to quiet a false premise is a workaround of the review, and it adds code with no
defect behind it. each point below rests on a premise the tree refutes:

| point | premise | the evidence |
|---|---|---|
| r008 blocker.1 | the `enweaveOneFanout` parallel case was deleted | it moved, verbatim, to `src/domain.operations/weave/enweaveOneFanout.live.integration.test.ts:23` (the given) and `:129` (`toEqual(6)`), under the tier-3 gate (F8) |
| r008 blocker.3 | the `>>>>>>> MODIFIED` case was deleted from the screen dogfood | that assert was never in the dogfood; it moved from `enweaveOneRoute.integration.test.ts` to `enweaveOneRoute.live.integration.test.ts:121`. the dogfood's diff is the gate wrap alone |
| r004 blocker.2 | the prompts have no acceptance journey | nine keyrack acceptance suites drive the tty prompts on a real pseudo-tty via `blackbox/.test/assets/pty-with-answers.js` (`keyrack.fill`, `keyrack.vault.*`, `keyrack.aws-params.*`, `keyrack.githubApp.discovery`, `keyrack.osDaemon.ownerIsolation`), with snapshots; the 65-file keyrack scope ran 2285/0. the CRLF cases are clamped one grain down, in `src/infra/promptLineInput.integration.test.ts` [t1] [t2], where a split chunk can be staged |
| r004 nitpick.1 | a caller may still pass `model` to the harness | no caller does: `rhx grepsafe --pattern '\bmodel:' --path blackbox/cli` finds only two boot.yml fixtures, and `rhx git.repo.test --what types` passes. haiku is the tier-2 model by the S5 rescope |

## .what (a) gives up
naught: no behavior changes, and each point's answer is a path a reviewer can open.

## .rework
clean.

## .confidence = 92%
each premise is checked against a file; the risk is a reviewer who reads the moved suites as a
weakened tier, which is F8's call.

## .where
`.reviews/peer/5.3.verification._.review.i001.*` r004, r008.
