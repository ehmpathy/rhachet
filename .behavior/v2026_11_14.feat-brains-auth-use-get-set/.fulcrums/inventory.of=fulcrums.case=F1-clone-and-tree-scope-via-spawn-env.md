# F1 — clone and tree scope via a pinned account injected at spawn

## .the fork

every clone on a box shares one login, `~/.claude/.credentials.json` (`asBrainCliSpawnEnv.ts:61-74`,
from #571). `use --scope clone|tree` needs a clone to read a different account than the grove. options:

- A. pin the account on the clone (or the repo), and at spawn inject a minted access token as
  `CLAUDE_CODE_OAUTH_TOKEN`, which already outranks the file (`isBrainAuthViaEnv.ts`)
- B. give the actor's brain dir its own `.credentials.json` and drop `CLAUDE_SECURESTORAGE_CONFIG_DIR=''`
  for it — the per-actor login v1.48.0 had and later retired
- C. ship grove scope only; defer clone and tree

## .taken

A, because it leaves the one-login model intact for every clone that has no pin, and the outrank
path already exists and is already checked.

## .rework

clean — a vision-stage choice; no code is built on it yet.

## .confidence — 55%, why low

an access token minted from a refresh token expires in about an hour, and an env token is not
refreshed by claude. a long clone session may outlive it. unprobed. C would narrow a stated
requirement (all three scopes, `inventory.of=requirements.case=28`), so only the wisher may choose it;
the vision keeps all three and asks (q1).

## .where

`1.vision.yield.md` → contract, q1 · case=4
