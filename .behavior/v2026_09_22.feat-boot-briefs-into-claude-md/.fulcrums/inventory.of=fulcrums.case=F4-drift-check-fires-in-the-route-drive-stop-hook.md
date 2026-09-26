# F4 — where the drift check fires

## .fork

a roleset change mid-session: where does a check that the clone's corpus lags its actor fire?

| option | |
|---|---|
| a. session start | before any drift can exist |
| b. each route stone | only on a route |
| c. the `route.drive` stop hook | was taken; outside the wish's bound |
| d. each enrollment delta | the exact moment of change |

## .verdict — VOID (F21)

there is no drift to check, so there is no check to place.

## .grounds

- a roleset change mints a new hash, so a new actor dir: the live clone still reads its own actor's
  corpus, correct for its roleset. that is a path move, not a stale read.
- a content change re-renders the actor's `boot.md` in place (F8); live clones take it at their next
  read, new clones at spawn. clones reference the actor, never copy it.
- the wisher: *"no drift apparatus."*

## .where

- F21 · vision `.freshness` · criteria usecases 5 and 6
