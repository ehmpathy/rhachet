# F20 — the cross-user `clone get` copy fix is its own PR (#704)

- **fork**: this PR makes the gate's deny real, so a cross-user `clone get --what buffer` now meets
  a rejected ack. `asCloneGetReply` reads any ack with a `phase` as an older daemon, so the refused
  caller reads `peer-probe-blind` and "re-enroll". fix the copy here, or pin it and file it
- **taken**: pin it and file it. the security invariant holds and is now proven through the cli: no
  row of the box reaches the caller (`clone.say.slowbox.realbrain [case2][t1]`). the copy fix needs
  a new probe-blind reason, whose closed set forces copy into the say's verdict, poll and degrade
  maps, or a classed throw on a parse the say's baseline probe shares. either choice moves the
  cross-user say path this PR has just proven. the snapshot pins today's tree and moves on purpose
  when #704 lands
- **rework**: dirty. a new member of a closed set, with copy in every map keyed by it
- **confidence**: 80%. the defect is reachable for the first time through this PR's own fix, which
  argues for in-PR; the ripple through the say path argues for its own
- **where**: `src/domain.operations/clone/socket/asCloneGetReply.ts:282`; issue ehmpathy/rhachet#704
- **verdict**: open. raised by `5.3 i004 r10 blocker.2`, whose test gap is closed here
