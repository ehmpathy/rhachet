# self review — 5.3.verification — has-behavior-coverage

walked `0.wish.md`, then `1.vision.yield.md` (the contract, the clamp, the edgecases), line by line,
against the checklist in `5.3.verification.yield.md`.

## the wish — each outcome holds, each with a test I can point to

| wish line | test | why it holds |
|---|---|---|
| lookup timeout is 60s | `constants.test.ts` pins `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS = 60_000` | the value alone is not enough — the bite in `clone.say.slowbox [case1]` (lookup set to 5_000 → red) proves the default path reads the constant |
| gate bound sits above the lookup | `constants.test.ts` strict-order check over the whole ladder | the gate is derived (`lookup + margin`), and the order assertion fails if a future edit reorders any bound |
| same-user say on a loaded box accepted | `genCloneSocketServer [case19]` (9s `ss`), `clone.say.slowbox.realbrain [case1]` (7s `ss`, a real claude, cli) | both drive the real gate and the real `ss`, slowed — no mock |
| clamp: red before, green after | bites cited in `5.1…yield.md` for both | each bite reverted only the bound and went red |

## the vision — each shipped item

- peer pid from the peer's line → parser caselist (14 rows) + `getSocketPeerCred [case1]` (a child
  peer, not this process). holds
- `ss` with no shell, faults by name → `getSocketPeerCred [case2]` (killed), `[case5]` (absent),
  `[case6]` (table over the read buffer, view `flooded`). the generic-fail branch is the fallthrough
  of the three named ones. holds
- hung-up caller not typed → `[case22]` + `computeCloneAuthGateAction.test.ts`. holds
- a loaded box reads as one → `getCloneInputStateOrBlind [case4]`, `computeCloneSayReport.test.ts`,
  `clone.say.slowbox.realbrain [case1]`, `clone.say.slowbox.integration [case2]`. holds
- cross-user still denied → `[case20]`, `[case21]`, `isCallerSameUser.test.ts`,
  `clone.say.slowbox.realbrain [case2]`. holds

## found and fixed

1. **two edgecases from the vision were absent from the checklist** — "lookup throws fast → deny"
   and "lookup never settles → `auth-gate-timeout`". the tests existed (`awaitCloneAuthGate.test.ts`
   case3 and case4, plus the new `isCallerSameUser` fault row and the gate-action timeout row), but
   the checklist did not name them, so a reviewer could not see the coverage. added two rows
2. **the vision still read F7 as open** in two places: the cons said "the 5s bound may have reaped
   it (F7 decides)", and an edgecase said the 60s kill "holds only once the exec bound is real;
   execution measures it". both were settled in execution. rewrote both to state what IS and cite
   `getSocketPeerCred [case2]`

lesson: a checklist row proves coverage only if it names the test. a test that exists but is not
named reads, to a reviewer, the same as an absent one.
