# F8 — the clone's peer pid is read from the peer's `ss` line; the daemon's reader is left

## .the fork

`getSocketPeerCred` read the reader's own pid (measured: read 3004316 = self; peer 3009574), so
the clone same-user gate passed every caller. the parse is shared with the keyrack daemon's
`getSocketPeerPid`.

- fix the shared `asSocketPeerPidFromSs` — both gates read the true peer
- add a peer-column reader for the clone only; the daemon keeps the old parse, filed apart
- ship the timeout fix alone; file the defect

## .taken, why

a new pure reader, `asSocketPeerPidFromSsPeerLine`, used by `getSocketPeerCred` only. the line
whose PEER column holds our inode is the caller's; a caller this user cannot see shows no process
tuple → null → deny (fail closed). the daemon's switch changes who keyrack admits, so it is its
own PR: ehmpathy/rhachet#686.

## .rework

clean — one new pure file + a one-line import swap. the daemon can adopt the same reader later.

## .confidence

100% — settled by the wisher (S3).

## .where

`src/infra/socket/asSocketPeerPidFromSsPeerLine.ts`, `src/infra/socket/getSocketPeerCred.ts`

## .verdict

settled by the wisher — fix the clone gate here (S3)
