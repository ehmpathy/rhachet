# ref: the 2026-09-28 outage, read against the code

> zoom-in of `ref.claude-code.credential-store._.md`. the timeline is the wish's (`0.wish.md`, §2–§3,
> first-party on `grove-ahbode-v20260901`, rhachet 1.48.0, claude-code 2.1.280). the mechanism is the
> other refs'. **this is an inference that fits every measured fact; the act itself was not caught.**

## .the facts

| time | fact (wish) |
|---|---|
| 13h30m36s | the shared file `~/.claude/.credentials.json` restored; `expiresAt` 21h30m20s |
| 21h25m20s | the 5-minute window opens for every clone that reads the shared file (`.refresh.md` claim 1) |
| 21h25m30s | actor `b6519bf1`'s own file refreshed — 7.9h out |
| 21h26m56s | the shared file blanked, in `RDn`'s exact shape (`.dead-token-clear.md` claim 1) |
| after | 18 symlinks intact; every linked clone shows `Login expired` |
| — | actor `07bb9428` holds its own file, 4.5h out, intact |

## .the read

1. **21h25m20s** — every clone enters the window together. under 1.48.0 each actor locks its own
   `_S()` (`.locks.md` claim 1), so clones of different actors race with no lock between them.
2. **21h25m30s** — a `b6519bf1` clone wins: it POSTs the shared refresh token, gets new tokens, and
   saves. the save renames a temp over its symlink (`.write.md` claim 2): `b6519bf1` now holds a
   private file with the new tokens, 7.9h out. **the shared file still holds the spent token.**
3. **21h25m30s → 21h26m56s** — the losers re-read under their own lock and find no new token, since the
   winner never wrote the shared file (`.refresh.md`, the 1.48.0 table).
4. **21h26m56s** — a loser POSTs the spent token → the server answers `invalid_grant` → `RDn` clears
   the file that loser writes (`.dead-token-clear.md` claim 3).
5. the shared file is blank; every linked clone reads it on its next mtime check → 18 dead clones.

## .the one step the code narrows but does not name

step 4's writer blanked the **shared** file, and 18 symlinks stayed intact. a symlinked clone that
clears detaches into a private blank (`.write.md` claim 2's table) and leaves the shared file alone. so
the writer read and wrote `~/.claude/.credentials.json` **directly**: its `_S()` was `~/.claude`.

| candidate with `_S()` = `~/.claude` | fits? |
|---|---|
| a clone from a tree on rhachet < 1.48.0 (no `CLAUDE_CONFIG_DIR`) | ✅ — the grove runs many trees; an older one spawns with the machine dir |
| a grove tool that runs `claude` bare | ✅ |
| the human's own `claude` | ✅ if one ran at 21:26 |

⇒ every candidate is a process that locks `~/.claude`, which no 1.48.0 clone locks. the race it lost
was to a clone behind a different lock. the fix (`inventory.of=options.case=O3-relocate-the-secure-storage-dir.md`)
puts every process on the box behind that one lock, so which candidate it was does not change the cure.

## .the two private files

- `b6519bf1` — the refresh at 21h25m30s fits step 2: a won refresh that detached.
- `07bb9428` — 4.5h out, so it refreshed near 17:30 (a 8h token): an earlier winner by the same
  mechanism, or the enroll's `kept` branch. the grove's file birth times would settle it.

## .why this began with 1.48.0

before #553 no clone set `CLAUDE_CONFIG_DIR`, so every `_S()` on the box was `~/.claude`: one file,
one lock, and every loser adopted (`.refresh.md` claim 2). #553 moved `we()` per actor and, with no
`CLAUDE_SECURESTORAGE_CONFIG_DIR`, moved `_S()` — and its locks — with it.
