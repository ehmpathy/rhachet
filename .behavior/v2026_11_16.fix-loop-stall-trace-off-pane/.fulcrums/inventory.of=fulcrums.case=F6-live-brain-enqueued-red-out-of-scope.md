# fulcrum F6: the live-brain `enqueued` rows that read red stay out of this change

## .the fork

the gated live-brain tier, run for verification, reads 8 rows red in two suites
(`clone.transcript-lag.realbrain`, `clone.screen-dogfood.realbrain` [case1]): `clone say` reports
`released` where the brain holds the message, so `enqueued` is never seen.

- **a.** fix the `queued` read and its live-brain arrange in this pr
- **b.** prove the red does not come from this change, and hand the fix to its own pr

## .taken — b

- a bisect with this change's one pty-path edit (the async mirror) turned off read the same 8 rows
  red; restored after (`.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-17T[time]Z.stderr.log`)
- the branch does not touch the verdict path: `computeCloneSayVerdict`, `computeCloneSayPollStep`,
  `getCloneSayObservation`, `computeCloneInputState` are unchanged; the socket server diff is a
  re-indent for the new `{ trace }` context and trace lines only
- the other four live-brain suites (joker, modalprobe, saybulk-probe, clone reach) pass: 36 rows
- the fix changes the `enqueued`/`released` contract of `clone say` and needs paid probes per try;
  it is caught as `dreams/v2026_11_17.followup.clone-say-enqueued-unread-on-live-brain.md`

## .rework — clean

if the wisher wants it here, it is new work in files this change does not edit; no code here
depends on the outcome.

## .confidence — 85%

why not higher: no run on `origin/main` itself on this host; the attribution rests on the bisect of
the one pty-path change plus the unchanged verdict path, not on a clean-checkout run.

## .verdict — 2026-11-17, the director: b holds

the `enqueued`/`released` red goes to its own pr. the write-up is pushed as a radio task into
ehmpathy/rhachet (findsert), title `fix(clone): clone say reads released where a live brain holds
the message (enqueued unread)`. held QUEUED at `.radio/` while `radio.uses` is blocked globally;
the issue number lands here once a human lifts it (`rhx radio.uses --global allow`) (seed S1).

## .where

stone 5.3.verification, `.behavior/v2026_11_16.fix-loop-stall-trace-off-pane/5.3.verification.yield.md`.
