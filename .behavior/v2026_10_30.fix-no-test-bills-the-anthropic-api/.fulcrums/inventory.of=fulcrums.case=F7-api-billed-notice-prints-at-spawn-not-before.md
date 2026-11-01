# F7 — the api-billed notice prints at spawn, not before

## .the fork
- (a) print it under the extant spawn gate, right after `genCloneOndisk` returns a spawn — beside the no-login line and the no-grove line (`invokeEnroll.ts:626-637`)
- (b) print it before `genCloneOndisk`, as the vision's case=5 [t1] reads ("before the clone starts")

## .taken
(a). `genCloneOndisk` decides inside whether it spawns, reuses a live slug, or refuses a slug collision. before it returns, enroll cannot tell a clone that will start from one that will not. under (b) the notice prints on a refusal too, where it lands ahead of the json error a machine parses off stderr — the hazard the extant gate's own `.note` names. (a) keeps one gate for all three seat notices.

## .what (a) gives up
in an attended seat the clone sends no request until the human types, so the notice precedes the first billed call. but `enroll … -p "<prompt>"` sends its prompt at once, so there the first call can race the notice by a moment. the notice still lands at the start of the session, in the same stderr, before any reply.

## .rework
clean: compute the spawn decision before `genCloneOndisk` (a read of the slug state it already does), print, then spawn. no contract or caller changes.

## .confidence = 70%
the vision's words say before; the intent, "the choice is seen at the moment it is made", is met for a seat but not strictly for a `-p` enroll.

## .where
`src/contract/cli/invokeEnroll.ts:629-632`; proof `blackbox/cli/enroll.acceptance.test.ts` [case2f].
