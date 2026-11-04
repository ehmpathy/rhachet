# S1 — the 30s client window is deferred

## .said

asked: "Should a same-user say on a loaded box still be accepted when the lookup takes longer than the client's 30s timeout, in this PR?"
chose: "No, defer (Recommended)"

## .settled

the PR ships the two bounds only. a lookup of 30s–60s reports an honest wedge; the client window is a follow-up.

## .landed

- F3 verdict
- case=3 care stays alterpath
