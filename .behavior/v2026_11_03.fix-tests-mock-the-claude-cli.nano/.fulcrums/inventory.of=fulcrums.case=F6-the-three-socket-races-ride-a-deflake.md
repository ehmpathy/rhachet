# F6 — the three socket races the full sweep exposed ride a deflake of their own

## .the fork

the full impacted integration sweep showed three reds that pass alone: `daemon [case9]`,
`getSocketPeerPid [case2]`, `getSocketPeerCred [case1]`. deflake them here, or catch them.

## .taken

caught: `.dream/v2026_11_03.followup.deflake-three-socket-races-under-the-full-sweep.md`, with the
cause of each read off the failure (a pid-file read race, an absolute wall-time bound, a peer socket
closed before its read).

## .why

- none reads a clone key, a mocked brain, or a file this pr changed; each is a keyrack/socket race
  that only a full parallel sweep surfaces. the env scrub made every integration file "impacted",
  which is why this pr's local sweep reached them
- each fix is its own diagnosis in a different domain; inside a nano test-mock pr it fails CLEAN
- ci runs the same sweep on push, so the record stays honest whichever way they land there

## .rework

clean — the deflake lands in its own pr; this one's contract does not move.

## .confidence

80% — the stone's own bar is "zero tolerance for flakes"; the counter is scope, and a reviewer may
weigh that bar above the nano bound. if so, the dream holds the shape of each fix.
