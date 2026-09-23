# fulcrum F23 — an unclassified probe-blind reason borrows the older-peer remedy copy

surfaced by the r009 (ergo-friction-hazards) L3 review of `5.1.execution.from_vision`, nitpick 1.
a **clean** rework, but wisher-scoped — it extends V8's declared closed `reason` slug set. folded
into the F17 / F20 reason-set family.

## .the fork stated fairly

`asCloneGetReply.ts:138-142` maps a probe-blind reply's reason three ways: a recognized slug is
kept, an OMITTED reason falls to `feed-not-live` (the milder "wait" remedy), and a PRESENT-but-
unrecognized reason falls to `peer-probe-blind`. that fallback direction is the deliberate,
defended r7-n1 conservative choice — for a cause we cannot classify, "re-enroll" costs at worst an
unnecessary re-enroll, where "wait" hangs a caller forever, so the fail-safe direction is
`peer-probe-blind`.

the residual the reviewer names: `peer-probe-blind`'s copy is *"this clone predates the screen read
channel — re-enroll the clone on a current version to read its screen state"*, and that copy is
**shared** with the genuine older-daemon path (`asCloneGetReply.ts:150`, `phase` present). so an
unclassified present reason — a newer peer's slug, a corrupt producer — is reported to the human as
an older, upgradeable peer, which asserts a version-skew CAUSE the observer does not actually know.
that is mildly at odds with the repo's own "every slug names an OBSERVATION" rule.

| option | the shape | cost |
|---|---|---|
| **A — current** | present-unknown reason borrows `peer-probe-blind` (slug + copy) | the copy asserts an older-peer cause on unknown evidence; the fallback DIRECTION (re-enroll) is right |
| **B — a distinct `unclassified-blind-reason` slug** | its own copy names the uncertainty ("the peer declared a probe-blind cause this build does not recognize — re-enroll or upgrade the reader") | a new member of V8's **closed `reason` slug set** that callers branch on — a contract change + a `domain.terms/` cluster + any snapshot that pins the reason copy |
| **C — reword the shared copy** | soften `peer-probe-blind`'s copy to name uncertainty | degrades the LEGITIMATE older-daemon path (line 150), which SHOULD assert the re-enroll cause plainly — so C trades a right message for a vaguer one |

## .taken, and why at the time

**A (current), deferred to the wisher.** the fallback direction is already the decided r7-n1 choice
and is not in question. B is the reviewer's preferred remedy and is the honest one — but it adds a
member to the machine channel's **closed `reason` slug set**, which V8 declares as a contract a
caller branches on for its safe action. `rule.require.review-test-changes` bars a silent change to a
decided vision contract, so the slug addition is the wisher's call, exactly as F17 (the reason-set
safety consequence) and F18 (a new machine-channel field) are. C is refused on its face — it
degrades the legitimate older-peer message to fix the fallback.

## .rework, and why

**clean.** B is a localized addition — one slug value, one copy row, one `isCloneProbeBlindReason`
arm, one `domain.terms/` cluster, and the reason-copy snapshot. it ripples no callers beyond the
copy table (a caller that does not recognize the new slug already has a default arm). it is graded
clean, and wisher-scoped only because the set it extends is a declared contract.

## .confidence 66%, and why it is low

the reviewer is right that the copy asserts a cause on unknown evidence, and B is the clean fix — so
a future PR is likely warranted. but it sits in the same closed-`reason`-set family as F17 and F20,
and whether the set gains a member, gets a shared taxonomy (F20), or keeps the conservative borrow
(the human still gets a re-enroll remedy that WORKS, only with a slightly-wrong cause) is a
reason-set design call the wisher should settle in one pass with F17 / F20, not piecemeal here.

## .where

`asCloneGetReply.ts:138-142` (the fallback) · `asCloneGetReply.ts:150` (the shared older-peer path)
· the `CloneProbeBlindReason` type + `isCloneProbeBlindReason` · the reason→copy remedy table ·
`domain.terms/` (a new slug owes a cluster) · the reason-copy snapshot.

## .the demos that RENDER this call

**NONE.** no `case=N` demo asserts the copy for an UNCLASSIFIED present reason — case=4 demos the
`feed-not-live` (omitted) and genuine older-peer (`phase`-present) paths, never the present-unknown
fallback. a B verdict changes no demo; it adds a slug + copy row the demos do not exercise.

## .the verdict

unruled. folded into the F17 / F20 reason-set wisher decision — a clean addition either direction
(A keeps the conservative borrow; B adds a distinct slug), settled in one pass with the reason-set
family rather than alone.
