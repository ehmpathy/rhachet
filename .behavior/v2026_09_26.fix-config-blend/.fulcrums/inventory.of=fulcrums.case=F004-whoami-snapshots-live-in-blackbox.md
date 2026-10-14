# F004 — every `clone whoami` output variant is already snapped, in `blackbox/`

## .the concern

`ergo-acceptance-journey-coverage` (5.3 i002 r007 blocker.1): the whoami contract changed (the tree row
`actor=@<exid>`, the json key `actorExid`), and "the positive-path tree render and its json payload are
not snapped anywhere in the target".

## .the stance — disputed: the snapshots exist; the lane's scope could not see them

the lane reviews `src/**` only. whoami's contract snapshots live in `blackbox/cli/__snapshots__/`:

| variant | snapshot |
|---|---|
| positive tree (`😶 you are …`, `└─ actor=@repo=ambient`) | `clone.acceptance.test.ts.snap:40` — [case1][t3] |
| positive json (`serial`, `slug`, `reachState`, `actorExid`) | `clone.acceptance.test.ts.snap:64` — [case1][t5] |
| negative: not inside a clone (tree) | `clone.acceptance.test.ts.snap:74` — [case1][t5b] |
| negative: not inside a clone (json) | `clone.acceptance.test.ts.snap:85` — [case1][t5c] |
| edge: a stale serial that names no on-disk clone (tree + json) | `clone.list.acceptance.test.ts.snap:44`, `:55` — [case4][t2] |

the `actorExid` rename shows in both positive snapshots (`actor=@repo=ambient`, `"actorExid": "repo=ambient"`).

## .what the council rules

that the whoami contract is exhaustively snapped, and the gap was in the lane's scope, not the coverage.
