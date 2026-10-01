# ref: claude-code's credential store — and how a per-actor CLAUDE_CONFIG_DIR split it

> source: `@anthropic-ai/claude-code@2.1.280`, read from the text its native binary embeds.
> every claim in this cluster carries the command that reproduces its excerpt. the minified names
> (`_S`, `we`, `td`, `wuo`, `cQ`) belong to this build alone; search by the string literals
> (`CLAUDE_SECURESTORAGE_CONFIG_DIR`, `.oauth_refresh.lock`, `tengu_oauth_token_refresh_race_resolved`),
> which survive a rebuild.

## .the answer in one screen

claude-code keeps two dirs, not one:

| dir | fn | env | holds |
|---|---|---|---|
| config dir | `we()` | `CLAUDE_CONFIG_DIR`, else `~/.claude` | settings, `CLAUDE.md`, projects, `.claude.json` |
| secure-storage dir | `_S()` | `CLAUDE_SECURESTORAGE_CONFIG_DIR`, else `we()` | `.credentials.json`, and every lock that guards it |

- rhachet 1.48.0 (#553) set `CLAUDE_CONFIG_DIR` per actor and left `CLAUDE_SECURESTORAGE_CONFIG_DIR`
  unset. so `_S()` fell back to the per-actor dir, and every refresh lock moved per actor — while a
  symlink kept one credential file for the whole box. N locks over one file: the lock serializes no one.
- a credential write stages a temp file and renames it over the target. rename(2) replaces a symlink
  rather than follow it, so a clone's first write detaches it: a private file with the new tokens, and
  a shared file that still holds the refresh token the server just rotated out.
- `CLAUDE_SECURESTORAGE_CONFIG_DIR=""` in each clone's spawn env points `_S()` back at the one
  machine dir while `CLAUDE_CONFIG_DIR` stays per actor: one file, one set of locks, no symlink.
  claude-code already forwards this var to the teammates it spawns.

## .index

| ref | holds |
|---|---|
| `ref.claude-code.credential-store.dir.md` | `_S()` vs `we()`; the env var's three cases; the macOS keychain name |
| `ref.claude-code.credential-store.refresh.md` | the 5-min window; the double-checked lock; the `race_resolved` adopt |
| `ref.claude-code.credential-store.locks.md` | the four lock paths; the mkdir lock; why a symlinked lock cannot work |
| `ref.claude-code.credential-store.write.md` | temp + rename replaces a symlink; the store that refuses a symlink |
| `ref.claude-code.credential-store.dead-token-clear.md` | `RDn`: the blank is claude-code's own clear after `invalid_grant`, field for field |
| `ref.claude-code.credential-store.incident-read.md` | the 2026-09-28 timeline read against the code |
| `inventory.of=options._.md` | the options, ranked; the cure these refs support is `case=O3` |

## .how to reproduce a citation

```sh
rhx claude.cli.probe --into .temp/claude-cli.probe --version 2.1.280
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern '<the pattern the claim cites>' --radius 600
```

`claude.cli.strings` reads only the probe's package, inside the repo, and prints each match with the
code around it; an unprintable byte shows as `.`. no excerpt in this cluster holds a token value —
each is code.

## .what stays unproven

- **which process wrote the blank.** the WHAT is settled: `RDn`, claude-code's dead-token clear after
  `invalid_grant` (`.dead-token-clear.md`). the WHO is narrowed, not named: no write path in `.write.md`
  writes through a symlink, so the writer had `_S()` = `~/.claude` — a clone from a tree on rhachet
  < 1.48.0, a grove tool, or the human's own `claude` (`.incident-read.md`). the cure is the same for all
- **which store 2.1.280 used on the grove.** the plain store follows a symlink on read and replaces it
  on write; the handle store refuses it on both. the clones read through their symlinks for hours,
  which fits the plain store
- **where the two "own file" actors got their files.** the wish reads them as the enroll's `kept`
  branch. the rename predicts a second source: each is a clone that won a refresh and detached.
  `b6519bf1` refreshed 86s before the blank. the grove's file times would settle it
- **that the server revokes on refresh-token reuse.** consistent with the blank at 3m24s before
  expiry and with claude-code's own dead-token set (`known_dead_refresh_token`); not measured
