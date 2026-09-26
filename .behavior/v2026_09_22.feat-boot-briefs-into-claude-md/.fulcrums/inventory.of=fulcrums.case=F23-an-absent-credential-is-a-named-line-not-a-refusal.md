# F23 — an absent credential is a named line, not a refusal

## .taken — by the driver, 2026-09-23. confidence 85%

when `~/.claude/.credentials.json` is absent, enroll makes no link and prints one line that the actor has no credential. it does not refuse.

## .the fork

| option | who it harms |
|---|---|
| refuse, exit 2 | every host that authenticates without that file — `ANTHROPIC_API_KEY`, Bedrock, Vertex, a gateway |
| **a named line, proceed** — taken | a file-auth host that lost its file: the clone meets *"Not logged in"*, with its cause already printed |

## .why 85%

rhachet cannot see which auth the cli will use: the env and the managed settings decide. a refusal keyed on one file would misfire on every other auth method. if the fleet is file-auth only, a refusal is the stricter choice, and the wisher may rule it.

## .rework — clean

one branch in `findsertBrainCredentialSymlink`, one case row.

## .where

`findsertBrainCredentialSymlink` · r007 nitpick.2
