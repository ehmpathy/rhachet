# F30 — an sso key the daemon will not renew reads as a permanent key

## .the fork

found in the 5.3 frictionless walk on this host: `npx rhx keyrack status --owner ehmpath` shows `ahbode.prod.AWS_PROFILE` with `expires in: 527m` and no `renew` leaf, and its `--json` row carries no `renew` field. the key was filed with no renew, either by an older daemon build or by an older cli at unlock. status renders it exactly as it renders `ehmpathy.prep.OPENROUTER_API_KEY`, a permanent key. a human cannot tell that this one will lapse at expiry.

- **a** — the daemon emits `renew: { off: 'not filed' }` for a held grant whose mech can renew but which has no renew entry, and status renders `renew = off` with `unlock again to renew`
- **b** — keep the cue at unlock: the skew warn (c17 / c18) names the old daemon at the moment it files no renew, and a fresh unlock with this build files one

## .taken

b. the daemon must know which mechs can renew to emit (a), and a grant held by an older daemon gets no such field at all, so (a) cures only the case where the cli was old and the daemon new. it moves the status wire, which F18 sends to its own pr with a skew test. the unlock warn already fires at the moment the gap is made.

## .rework

dirty: a new wire field on the status row, a mech lookup in the daemon's status handler, and a skew case for a daemon that predates the field.

## .confidence — 65%, why not higher

the warn fires once, at unlock, and scrolls away. a human who reads status hours later, which F26 makes the renew's surface, sees no cue. on this host that is the live state right now.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleStatusCommand.ts`
- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts`
- `.dream/v2026_11_20.refactor.keyrack-renew-record-reshape.md` item 23

## .the dedicated pr

per `rule.forbid.deferrals-short-of-a-dedicated-pr` (5.3 i001 r001 blocker.2), planned as part of F18's reshape, since both move the daemon's status wire and each owes one skew test:

- **title** — `fix(keyrack): status names an sso key the daemon will not renew`
- **diff** — `handleStatusCommand.ts` emits `renew: { off: 'not filed' }` for a held grant whose `(vault, mech)` can renew and has no entry. `asKeyrackStatusRow.ts` reads it. `asKeyrackStatusKeyBranch.ts` renders `renew = off` with the unlock that files one. a skew case covers an old cli against a new daemon
- **bound** — the status wire and render only; the record reshape rides F18

## .verdict

open — to the commander at the pr.
