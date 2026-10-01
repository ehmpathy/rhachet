# F15 — the login write lock speaks proper-lockfile's protocol in house, not via the package

## .the fork

`withBrainAuthWriteLock` must exclude claude-code's own writers of `~/.claude/.credentials.json`, which lock `~/.claude/.storage-write` with proper-lockfile (`realpath: false`, `stale: 15000`). the route may (a) speak that directory-lock protocol in a small in-house operation, or (b) add `proper-lockfile@4.1.2` as a pinned dependency and call it.

## .taken, and why at the time

(a).

- the protocol is three moves: an atomic `mkdir`, a stale bound on mtime, and an mtime refresh while held. each is clamped in `withBrainAuthWriteLock.integration.test.ts` (cases 1 through 6)
- the in-house form knows each lock dir by inode, so a release or a stale clear never removes a peer's fresh lock, and that guard is clamped by case 4
- the package's documented default `onCompromised` throws, which from its update timer is the same process-crash class review i007 r011 raised against the heartbeat; a caller must override it to stay safe
- a new runtime dependency on the enroll path widens the release for a fix that needs to ship fast

## .rework

clean — one file calls the lock; a swap to the package touches that file, its test, and `package.json`.

## .confidence, and why it is low

75%. two implementations of one protocol can drift; if claude-code changes its lock options, the in-house form must follow by hand, where a shared package would at least share defaults.

## .where

`src/domain.operations/brain/auth/withBrainAuthWriteLock.ts`; review i007 r011 nitpick.1.
