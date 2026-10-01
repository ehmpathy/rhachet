# F10 — the regression clamp proves where the login lock set lives, not a live N-process race

## .the fork

the wish's done test 4 asks for a clamp that reproduces the concurrent refresh over one shared credential. the clamp may (a) prove the mechanism the race depends on — every clone's login writes land in the one `~/.claude` store, under its one lock set — with one real claude-code through the real enroll spawn; or (b) drive two or more real claude-code refreshers at one file in the same refresh window.

## .taken, and why at the time

(a).

- the 1.48.0 defect was never the concurrency itself: claude-code already serializes refresh under its `.storage-write` lock. the defect was that each actor's lock set sat in its own brain dir, over one symlinked file, so the locks did not exclude each other. the fix routes every clone's store and lock set to `~/.claude`. so the invariant a regression breaks is **where the store lives**, and the clamp asserts exactly that: claude-code's own write lands in `~/.claude`, and the actor's brain dir holds no login
- a regression that re-splits the lock set (a spawn path that drops `CLAUDE_SECURESTORAGE_CONFIG_DIR=''`, or a claude-code change to how it keys the store) moves that write back to the brain dir, and the clamp goes red. that is the 1.48.0 topology, caught
- (b) needs a real refresh to succeed for the winner, so the suite would spend a real refresh token. the constraints forbid that: no real token is read, planted or sent. with fake tokens every refresh fails `invalid_grant`, so an N-process run shows N rejections and cannot show "one winner, peers keep the login"
- the lock the adoption path takes is clamped separately, with real contention: `withBrainAuthWriteLock.integration.test.ts` holds claude-code's lock dir and proves a writer waits it out, and clears a stale lock

## .rework

clean — an N-process clamp is additive, a new acceptance case beside the one that stands.

## .confidence, and why it is low

75%. the argument rests on claude-code's refresh lock staying correct once every clone shares it. that is claude-code's code, read via `rhx claude.cli.strings` (proper-lockfile on `~/.claude/.storage-write`), not measured under a live race. the grove's post-release uptime is the field test.

## .where

`blackbox/cli/enroll.shared-brain-auth.acceptance.test.ts`; wish › done test 4; review i002 r008 blocker.2.
