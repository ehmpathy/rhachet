# S2 — the scan abort on hangup is deferred

## .said

asked: "Should killing a leftover `ss` scan when its caller hangs up ride along in this PR?"
chose: "No, defer (Recommended)"

## .settled

the PR does not thread an abort from socket close into the lookup exec; the dream holds it.

## .landed

- F6 verdict
