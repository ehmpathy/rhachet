# seed S7: the winner's token survives, and a clone recovers without a respawn

## .said

> i.e., upon successful auth, put the correct one in global again, then rm the broken ones and resymlink all

> winners token survives, i've experienced that. and login does recover without respawn

## .settled

- the fallback repair, in order: on a won refresh, adopt the winner's credential into the global
  file; remove every real credential file in the actor dirs (the winner's and each blank); relink
  every actor to the global file
- a won refresh's token stays valid after the losers reuse the old refresh token — the server does
  not revoke the whole family
- a live clone that shows `Login expired` recovers once its credential file holds a live token again,
  with no respawn

## .landed

- `refs/inventory.of=options.case=O10-adopt-the-winner.md`
- `refs/inventory.of=options._.md` — `.gaps`
- `refs/define.invariant.a-blank-proves-the-winner-missed-the-global-file.md` — `.scope`
