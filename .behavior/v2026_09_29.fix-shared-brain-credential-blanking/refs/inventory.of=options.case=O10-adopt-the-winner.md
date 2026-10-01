# option O10: adopt the winner — repair the broken symlink

## .what

a watcher — its own daemon, never folded into the keyrack daemon (keyrack is to become a separate
dependency of rhachet; see `../.seeds/…case=S5`) — sees an actor's `.credentials.json` turn from a
symlink into a real file. that real file holds the refresh winner's fresh token. the watcher:

1. copies its content into `~/.claude/.credentials.json` (temp + rename, mode 0600)
2. removes every real `.credentials.json` in an actor dir — the winner's, now adopted, and each
   loser's blank — and relinks each one to `~/.claude/.credentials.json`

every clone then reads the fresh token on its next mtime check (`case=O7`, `fD`).

## .adopt first, then relink — never relink alone

the run (`case=O3`, `.the run`) proves a linked actor's write — a won refresh or a dead-token
clear — lands in its own actor dir and leaves `~/.claude` untouched. so every real file in an actor
dir is one of two:

| the actor file holds | what it is | the repair |
|---|---|---|
| a blank refresh token | a loser's clear, contained to that actor | discard it, relink |
| a real refresh token | the winner's fresh token — the only live one on the box | adopt it into `~/.claude`, then relink |

⚠️ a relink alone points the losers back at the shared file, which still holds the token the winner
just spent. they refresh with it, meet `invalid_grant`, and blank themselves again. the adopt must
come first.

## .verdict — 🟢 the documented fallback for S1; not built while O3 holds

- ✅ normal auth path, no new scheme — S1's constraint holds
- ✅ aims O9's instinct at the file that holds the live token
- ✅ **the winner's token survives** — the server does not revoke the family when the losers reuse
  the old refresh token (first-party, `../.seeds/…case=S7`)
- ✅ **a blanked clone recovers with no respawn** — a clone that shows `Login expired` picks up a
  refilled credential file (first-party, S7). so a blank the watcher repairs costs a moment, never a
  fleet restart
- ❌ no live rotation across subscriptions — S2 and S3 still need O5 or O7
- ⚠️ a brief blank window remains: a loser can blank itself before the adopt lands. per S7 it
  recovers on the relink, so the window costs a failed turn at most, never an outage
- ⚠️ it treats the symptom — a watch per box that O3 does not need. hence rank 2 (S6)

## .when to build it

only if O3 fails: a claude-code release stops to honor `CLAUDE_SECURESTORAGE_CONFIG_DIR`, or the
O3 clamp goes red on a bump. until then this entry is the plan, not the code (S6).

## .the trigger — what kicks off the adopt

linux has no bare "run this on file change" hook; some process must hold the inotify watch. the
choices, from lightest on rhachet:

| trigger | who holds the watch | latency | fit |
|---|---|---|---|
| systemd `.path` unit (`--user`) → oneshot `.service` | systemd | ~ms | 🟢 no daemon of ours. a template unit per actor dir, installed by enroll. needs user linger on the grove box (rhachet targets linux only) |
| incron | `incrond` | ~ms | 🟡 a daemon anyway, and rarely installed |
| a claude-code hook in each clone (e.g. PreToolUse) that `lstat`s its own credential | the clone | next tool call | ⛔ too slow — the loser refreshes within seconds, and an idle clone never fires |
| our own inotify daemon | rhachet | ~ms | 🟡 the baseline, per S5 |

no poll is needed in any row: inotify is event-driven, the kernel wakes the watcher.

### .one watch on the global file — the simplest variant

one systemd `.path` unit with `PathChanged=%h/.claude/.credentials.json`, whatever the actor count.
the global file changes at exactly one moment in this failure — the loser's blank — so the unit
fires then, and its oneshot:

1. reads the global file; if its refresh token is non-empty, exits (not a blank)
2. finds the actor dir whose `.credentials.json` is a real file with a non-empty refresh token —
   the winner
3. adopts it into the global file (temp + rename, 0600) and relinks that actor's symlink

| | one watch on the global file | a watch per actor dir |
|---|---|---|
| units | 1 | 1 per actor, installed at enroll |
| fires on | the blank | the winner's write |
| blank window | a brief one — every clone sees the blank until the adopt lands; each recovers on the refill (S7) | none, if the adopt beats the loser's refresh |
| unverified | naught — recovery on refill is first-party (S7) | the race against the loser's retry loop; moot, since a loser that blanks recovers too |

⚠️ a raw inotify watch must sit on the **dir**, not the file (systemd's `PathChanged=` does this for
you): the winner's write replaces the directory entry, so the
event is an `IN_MOVED_TO` / `IN_CREATE` on `brain/.claude/`, and a watch on the old symlink dies
with it. a systemd `PathChanged=` on the dir covers this; add a `TriggerLimitIntervalSec=` so a burst
of writes cannot rate-limit the unit into failure.

### .why the order of adopt vs blank does not matter

the watch fires on the winner's rename — `IN_MOVED_TO .credentials.json` in its `brain/.claude/`.

- **adopt lands first** → the global file holds R2, so a loser's `RDn(R1)` compares R2 ≠ R1 and
  blanks naught
- **blank lands first** → the adopt overwrites the blank with R2; every clone re-reads it on its
  next mtime check (`fD`), and a clone that already showed `Login expired` recovers with no
  respawn (S7)

the watcher must skip its own relink: the relink is itself a rename into the same dir, so act only
when `lstat` shows a regular file with a non-empty refresh token.

## .citations

see `case=O9` for the write that breaks the symlink and the compare-and-clear that blanks the
global file.

## .evidence

family survival and recovery without respawn are first-party, from the wisher's own fleet (S7).
if O10 is ever built, its acceptance test reproduces both: a real file with a live token in one
actor dir, a blank in the global file, the adopt, then `auth status` in every actor reads
`loggedIn: true` — presence and the auth outcome only, never the token value.
