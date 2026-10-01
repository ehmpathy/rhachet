# option O2: one shared CLAUDE_CONFIG_DIR, boot delivered another way

## .what

every clone runs with the same `CLAUDE_CONFIG_DIR` (as before #553), so one lock serializes every
refresh. the per-actor boot corpus reaches the clone some other way.

## .verdict — ⛔ ruled out by the wisher

one config dir for every clone breaks actors. the brain dir is the actor's
(`define.brain-dir-repo-vs-actor`): its settings, hooks, and user-scope `CLAUDE.md` boot differ per
actor, and a shared dir collapses them into one.

## .citations

the re-read before the lock, so a loser adopts a winner's fresh token — the mechanism a single
shared dir would have relied on:

```js
let M=await Ha(y); if(M.accessToken!==P) return "refreshed"   // race_resolved
```
