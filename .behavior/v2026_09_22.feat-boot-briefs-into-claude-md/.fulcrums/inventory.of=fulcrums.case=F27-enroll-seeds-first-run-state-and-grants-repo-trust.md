# F27 — enroll seeds first-run state and grants repo trust

## .fork

claude keeps its first-run gates in `<configDir>/.claude.json`. D4 relocates the config dir, so an
actor's brain dir starts with none of the state a human cleared long ago — the folder-trust prompt,
the onboard flow, the api-key prompt. a pty clone has no keyboard to answer them.

| option | |
|---|---|
| a. gate the write on M3 | write only after journey [t3] shows the prompt appears |
| b. write unconditionally, copy only what the human accepted | trust left to the human's own record for the repo |
| c. write unconditionally, and grant trust for the enroll repo | the enroll itself is the consent |

## .verdict — TAKEN, 75%, rework clean

(c). (a) leaves a named operation with no plan behind a measurement, and the write is inert where
the cli needs none. between (b) and (c): a human who runs `rhx enroll` in a repo they never opened
in `claude` would get a clone stuck on the trust prompt under (b). the enroll is an explicit act in
that repo, and the clone's cwd is that repo, so the grant covers exactly the dir the human pointed
at. the onboard flag, the theme and the approved api keys are copied, never invented — a key the
human never approved stays unapproved.

## .why the confidence is not higher

the trust grant is a consent inferred from an act, not asked. a wisher may prefer (b) and a named
line that tells the human to open `claude` in the repo once.

## .rework

clean: drop the trust key from `asBrainFirstRunState` and add the named line. one transformer, one
test row.

## .where

- blueprint: D11 · the enroll codepath · `.by case` (`asBrainFirstRunState`, `findsertBrainFirstRunState`) · usecase 1 · M3
- review: i008 r011 blocker.1, r012 blocker.1
