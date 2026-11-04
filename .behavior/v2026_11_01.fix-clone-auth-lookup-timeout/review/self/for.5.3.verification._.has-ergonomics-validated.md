# self review — 5.3.verification — has-ergonomics-validated

no repros artifact exists, so each captured i/o is scored directly against `def.ergonomic`. captures
are from the built artifact (`dist/`, after `build:compile:tsc`), via `rhx clone say` against a real
enrolled clone — `.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-02T00-24-12Z.stderr.log`
and the snapshot that run verified.

## path 1 — a say on a loaded box that lands

input: `rhx clone say @:slowbox --what 'poke slowbox-x1'` — no new flag.

```
😶🎙️ said to @:slowbox
   └─ 🟡 screen probe unanswered (a loaded box) — verified by transcript; no action needed
```
exit 0

| def.ergonomic | score |
|---|---|
| zero surprises | ✓ — the human's own say lands as their own; the old false "not the same unix user" is gone |
| intuitive | ✓ — the leaf says what to do: naught |
| unambiguous | ✓ — "unanswered" reads one way; "a loaded box" names the cause in the human's words |
| plain domain words | ✓ — the leaf keeps its peers' shape, `<state> — verified by transcript; <action>` (cf. `feed faulted — verified by transcript; re-enroll to rebuild`), so it reads as one of a set |
| defaults match the common case | ✓ — the bare command does the work |
| scannable | ✓ — a two-line tree; the 🟡 glyph is the repo's degrade marker, used by every peer leaf |
| status visible | ✗ — 14.4s of silence before the tree. predates this PR; its own PR, #688 (see the frictionless review) |
| errors name the fix | n/a — a success |
| convenient | ✓ — no retry, no flag, no re-enroll |
| safe | ✓ — no prompt to re-send, so no path to a doubled message |

## path 2 — a say on a loaded box that cannot be verified

input: `rhx clone say @:slowbusy --what 'hold-me-slowbox'` (the clone holds the message, no transcript rise).

```
💥 MalfunctionError: the clone did not answer its screen probe in time (a loaded box: its auth check is slow) and the transcript did not rise within the bound

{
  "hint": "do NOT blind re-send — the message reached the pty and may have landed (a re-send would double it). wait for the box to calm, then read the clone with `clone get`; a `get` that times out too means the box is still loaded. a re-enroll does not help",
  "delivered": true,
  "verdict": "unreadable",
  "reason": "probe-unanswered",
  ...
}
```
exit 1

| def.ergonomic | score |
|---|---|
| zero surprises | ✓ — exit 1, a `MalfunctionError`: the system could not verify, the caller did naught wrong |
| intuitive | ✓ — the hint's first words are the one move to avoid, then the move to make |
| unambiguous | ✓ — `delivered: true` with `verdict: unreadable` says "it got there, we could not see it land"; the reason is its own slug, no longer shared with a brand-new clone's (`feed-not-live`) |
| plain domain words | ✓ — "a loaded box", "wait for the box to calm" |
| defaults match the common case | ✓ |
| scannable | ✓ after a fix (below) — header, then the metadata block every clone-say failure prints |
| status visible | ✗ — the same silent wait, ~30s here. #688 |
| errors name the fix | ✓ — wait, then `clone get`; and the dead end is named before the human hits it |
| convenient | ✓ |
| safe | ✓ — `do NOT blind re-send` guards the only harmful move |

## path 3 — another user's say

```
💥 MalfunctionError: clone refused the message: the caller is not the same unix user as the clone — a clone socket accepts only its own user; run the say as the user that enrolled the clone
```

copy unchanged by this PR; snapped at the server grain (`[case20]`, `[case21]`). ✓ on every line for
a true other user. for a same-user caller `ss` cannot attribute, "run the say as the user that enrolled
the clone" is false — F13 chose fail-closed, and the truthful reason is #683.

## found and fixed

1. **the path-2 header did not scan like its peers.** it read `… in time — the box is too loaded for
   the probe (its auth check is slow) — and the transcript did not rise within the bound`: two em-dash
   asides around a parenthetical, where every peer message takes the form `X (cause) and the transcript
   did not rise within the bound`. rewritten to `… in time (a loaded box: its auth check is slow) and
   the transcript did not rise within the bound` — one aside, the peer form. snapshots moved for that
   one entry in `computeCloneSayReport.test.ts.snap` and `clone.say.slowbox.acceptance.test.ts.snap`
   (scoped `--resnap`), then each verified on an independent run with no resnap:
   unit `tests: 19 passed` (`…/what=unit/2026-11-02T00-25-57Z.stdout.log`), acceptance
   `tests: 9 passed` (`…/what=acceptance/2026-11-02T00-24-12Z.stdout.log`)

## held, with reason

1. **the silent wait** — scored ✗ on two paths. predates this PR; an output contract across the
   clone-say suites, so its own PR (#688; fulcrum F12 holds the measured cost)
