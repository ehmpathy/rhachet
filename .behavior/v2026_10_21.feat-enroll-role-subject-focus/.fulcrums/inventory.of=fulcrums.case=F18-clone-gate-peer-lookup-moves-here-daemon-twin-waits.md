# F18 — the clone gate's peer lookup and its daemon twin both move in this pr

## .the fork

the order was to fix the 3 `getCloneSayObservation` reds so they hold under load. their cause was
the shared `ss -xp` peer lookup, and the clamp showed that lookup's parse can return the
server's own pid. the keyrack daemon's session gate rides the same parse.

- a. move the clone gate alone (`getSocketPeerCred`) onto `ss -x` + a holder scan; catch the
  daemon's move as a dream
- b. move both the clone gate and the daemon's `getSocketPeerPid` in this pr

## .taken — b

first taken as a, then moved to b once the daemon's twin went red on this box: its
`execSync('ss -xp')` passed its 5s timeout under load, and the gate refused the test harness's
own `keyrack get` with `ss command failed`. a red with its cause outside the diff is still red,
so the twin moved here. it stays sync (a sync scan beside the async one, both built on shared
/proc operations), so the gate's memoized verdict and its data handler are unchanged.

## .rework — dirty

the daemon gate's live behavior changes: which pid it checks, and how it finds it.

## .confidence — 80%, and why it is not higher

the sync scan stalls the daemon for its duration. it is far below the `-xp` cost it replaces
(the clamp bounds it under 1s on a host with 200k ballast fds), but an async gate would stall
naught, and that is a larger change to the data handler.

## .where

- `src/infra/socket/getSocketPeerCred.ts`, `asSocketPeerInodeFromSs.ts`, `getSocketInodeHolderPid.ts`,
  `getSocketInodeHolderPidSync.ts`, `getAllProcPidsNewestFirst.ts`, `isSocketInodeHeldByProc.ts`,
  `isSkippableProcError.ts`
- `src/domain.operations/keyrack/daemon/svc/src/infra/getSocketPeerPid.ts` + its integration clamp

## .verdict

open
