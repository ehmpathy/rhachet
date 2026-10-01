# inventory of options — stop the shared-credential blank

axis: `case` — one candidate cure per entry, in the order it surfaced.

every source citation is from claude-code `2.1.280` (build `80abbfe7`), read via
`rhx claude.cli.strings --in .temp/claude-cli.probe --pattern '<ERE>'`. identifiers are minified
names in that build; they drift across releases.

## .the root, in one breath

#553 gave each actor `CLAUDE_CONFIG_DIR=<actorDir>/brain/.claude` and symlinked its
`.credentials.json` to `~/.claude/.credentials.json`. both refresh locks are keyed on the config
dir, so N actors hold N locks over one file. and the credential write refuses to follow a symlink,
so a refresh winner's fresh token lands in its own actor dir while the shared file keeps the dead
one — which the next refresh then blanks for every clone. proven from the code in
`define.invariant.a-blank-proves-the-winner-missed-the-global-file.md`.

## .the cases

| case | option | verdict | live rotation (S3) | normal auth path |
|---|---|---|---|---|
| O1 | [symlink the lock dir to global](./inventory.of=options.case=O1-symlink-the-lock-to-global.md) | ⛔ dead — proper-lockfile cannot hold a symlinked lock | n/a | ✅ |
| O2 | [one shared CLAUDE_CONFIG_DIR, boot delivered another way](./inventory.of=options.case=O2-one-shared-config-dir.md) | ⛔ ruled out — one config dir breaks actors | ❌ | ✅ |
| O3 | [relocate the credential store via CLAUDE_SECURESTORAGE_CONFIG_DIR](./inventory.of=options.case=O3-relocate-the-secure-storage-dir.md) | 🟢 verified from the code and by a run — the root cure for S1: `""` moves the file and every lock to `~/.claude` | ❌ (✅ via S2 per-subscription dir + mtime re-read) | ✅ |
| O4 | [host-managed credentials (HOST_CREDS_FILE, SDK host refresh)](./inventory.of=options.case=O4-host-managed-credentials.md) | ⛔ gated to desktop / vscode / sdk hosts | — | ✅ |
| O5 | [setup token per reach, injected as CLAUDE_CODE_OAUTH_TOKEN](./inventory.of=options.case=O5-setup-token-via-env.md) | 🟡 kills the race; no live rotation | ❌ spawn only | ✅ |
| O6 | [apiKeyHelper with a keyrack command](./inventory.of=options.case=O6-api-key-helper.md) | ⛔ api-key channel, bills the console, not a subscription | ✅ 5min / on 401 | ❌ |
| O7 | [per-actor credential file that rhachet writes](./inventory.of=options.case=O7-per-actor-credential-file.md) | 🟢 lead candidate for S2+S3 | ✅ next read | ✅ |
| O8 | [local rotation proxy via ANTHROPIC_BASE_URL](./inventory.of=options.case=O8-rotation-proxy.md) | 🟡 works; a daemon in every request path | ✅ per request | ❌ |
| O9 | [backup-and-revert of the global file](./inventory.of=options.case=O9-backup-and-revert.md) | ⛔ on one file (its last good copy is the dead token, by `RDn`); 🟢 across every credential file | — | ✅ |
| O10 | [adopt the winner: repair the broken symlink](./inventory.of=options.case=O10-adopt-the-winner.md) | 🟢 the documented fallback — the family survives and clones recover on refill (S7); not built while O3 holds | ❌ | ✅ |
| O11 | [a central refresher ahead of the window](./inventory.of=options.case=O11-central-pre-window-refresher.md) | ⛔ shrinks the race window, leaves the race — still N locks | ❌ | ✅ |
| O12 | [a hardlink in place of the symlink](./inventory.of=options.case=O12-hardlink-in-place-of-symlink.md) | ⛔ rename replaces a hardlink too | ❌ | ✅ |

## .recommendation — for S1

| rank | option | why |
|---|---|---|
| 1 — preferred | `case=O3`: spawn with `CLAUDE_SECURESTORAGE_CONFIG_DIR=""`, drop the credential symlink | lowest effort — one env var at spawn plus a migration. removes the cause: one file and one lock set, the pre-1.48.0 topology. no daemon |
| 2 — fallback, documented, not built | `case=O10`: an inotify watch that adopts the winner's real file into the global file, removes every real actor credential, and relinks all | built only if O3 fails. viable: the winner's token survives and a blanked clone recovers on refill with no respawn (S7). it treats the symptom: a watch per box |

⇒ re-verify O3's citations (`_S()`, the locks) on each claude-code bump; if a release stops to
honor the variable, fall back to O10.

## .gaps — each owes a measurement before the vision settles

- **two live processes on the one lock** — the run (`case=O3`, `.the run`) proves where the read and
  the write land; that a loser then waits on the shared lock and adopts rests on the code
  (`ref.claude-code.credential-store.refresh.md`), not yet on a run
- **which `~/.claude` process wrote the 2026-09-28 blank** — the run settled that a 1.48.0 clone
  could not (its clear replaced its own link, the shared file stayed planted). the writer ran with
  `_S()` = `~/.claude`: a tree on older rhachet, a grove tool, or the human's `claude`
  (`ref.claude-code.credential-store.incident-read.md`). O3 cures all three
- **O7's shape** — does claude-code accept a stored credential with no `refreshToken`, the
  inference scope only, and a far `expiresAt`? and what does a live clone do when that token is
  revoked mid-session?
- **usage-limit signal** (S3, S4) — how rhachet learns a clone hit its limit: the transcript, the
  `anthropic-ratelimit-unified-*` headers, or a probe

## .settled

- **family revocation** — none: the winner's token survives a reuse of the old refresh token, and a
  blanked clone recovers on refill with no respawn (first-party, `../.seeds/…case=S7`). O10 stands
  as a viable fallback

## .see also

- `../.seeds/inventory.of=seeds._.md` — S1..S4, the requirements these options answer
- `../0.wish.md` — the measured topology (18 symlinks + 2 real files)
