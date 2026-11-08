# F3 — the `.husky` hook defects are fixed upstream, in the practice that stamps them

## .the fork

the peer round on `5.1.execution.from_vision` (i001) found real defects in four `.husky` files the
boot's `declapract` upgrade landed on this branch:

- `check.timestamps.lock.sh` — an empty index read passes (`git rm --cached` on the hook slips the
  lock); `git hash-object` is unguarded, so a git fault reads as a hook edit (r002 blocker.1, r006
  blocker.1, r006 nitpick.1)
- `check.timestamps.sh` and `check.secrets.sh` — no `pipefail`, so a scan fault reads as clean (r002
  nitpick.1, nitpick.2); the openai shape matches an `sk-ant-` key first (r009 nitpick.3); no test of
  the error paths (r009 nitpick.2); a rhetorical tail in the timestamps header (r001 nitpick.1)

- **A** — fix them upstream in `ehmpathy/declapract-typescript-ehmpathy`
  (`practices/husky/best-practice/`), dispatched by radio; this branch carries the files as stamped
- **B** — edit the four files here

## .taken, and why at the time

A. every file is a declapract best-practice file, byte for byte. a local edit is reverted by the
next `declapract upgrade` in this repo, and it fixes one repo of the many the practice stamps — the
defect stays shipped everywhere else. the practice also owns the lock's expected hash and a test
asset for an edited hook (`demo-repo-with-edited-timestamp-hook`), so the fix and its clamp belong
beside them. this is `rule.require.solve-at-cause` (ehmpathy/architect): the cause lives upstream.

## .rework

clean — once the practice ships the fix, the next `declapract upgrade` here lands it. no caller in
this repo leans on the defect.

## .risk

low — the defects are gaps in a local pre-commit guard, never a prod write or a credential. each one
needs a fault (a git read failure, a broken regex) or a deliberate `git rm --cached` to open; ci's
own secret and timestamp gates are unaffected.

## .confidence — 85%, and why it is not higher

`rule.forbid.deferrals-short-of-a-dedicated-pr` reads strictly; an upstream fix in its own repo is
the dedicated pr it asks for, but the wisher may prefer a local patch that rides until it lands.

## .where

- `.husky/check.timestamps.lock.sh`, `.husky/check.timestamps.sh`, `.husky/check.secrets.sh`
- upstream: `ehmpathy/declapract-typescript-ehmpathy` `src/practices/husky/best-practice/`, as
  ehmpathy/declapract-typescript-ehmpathy#789
