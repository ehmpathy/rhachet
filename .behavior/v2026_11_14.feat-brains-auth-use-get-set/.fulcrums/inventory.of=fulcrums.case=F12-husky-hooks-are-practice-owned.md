# F12 — the husky hooks are fixed upstream, not here

## .the fork

peer reviews (r1, r4, r5, r7) flagged `.husky/check.timestamps.lock.sh` (positional `$1`/`$2` in
its halt helper) and `.husky/check.timestamps.sh` (a defensive docblock).

- **A** — leave both as stamped; reseed the fix to the husky practice that owns them
- **B** — edit both here

## .taken, why

**A**. the lock declares itself practice-stamped (`TIMESTAMPS_LOCK_EXPECTED`, "stamped by the
practice on apply") and forbids a hand edit to the hook it guards: an edit to `check.timestamps.sh`
halts every commit until `npx declapract apply --practice husky` reverts it. an edit to the lock
helper would also be overwritten on the next apply. the fix belongs in the practice, caught as a
reseed dream.

## .rework

clean: the practice ships the fix, and the next apply lands it here.

## .confidence — 90%, why not higher

the positional helper is a nit even upstream; the practice owner may hold it as is.

## .where

- `.husky/check.timestamps.lock.sh`
- `.husky/check.timestamps.sh`
- `.dream/v2026_11_14.reseed.husky-timestamp-lock-named-args.md`

## .verdict

open.
