# howto.clear-a-stale-git-index-lock

> **a stale `index.lock` is cleared by `rhx git.crew.unlock`, never by an `rm`.**

a worktree's index lock lives in the main checkout's git dir
(`<repo>/.git/worktrees/<name>/index.lock`), outside the worktree, so a clone cannot reach it and
must not try. `rhx git.crew.unlock` checks that no process holds the lock, removes it, and reads
it back absent.

| when… | then… |
|---|---|
| a git write fails `Unable to create '…/index.lock': File exists` more than once over minutes | the lock is likely stale. ask for `rhx git.crew.unlock` |
| you would write an `rm` of the lock into an ask | 🔴 name `rhx git.crew.unlock` instead — it proves no holder first |
| a lock blocks you once | retry once; a live git process holds it briefly |

measured 2026-11-06, `ehmpathy/rhachet` @ `beav/fix-claudemd-excludes-common`: a 3.9-day-old lock
with no holder blocked every stage; `rhx git.crew.unlock` removed it.
