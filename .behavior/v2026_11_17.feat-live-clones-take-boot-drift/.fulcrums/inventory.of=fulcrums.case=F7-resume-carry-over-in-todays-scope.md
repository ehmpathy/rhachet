# F7 · the resume carry-over ships in this pr, not a later one

## .the fork

- **a.** this pr writes `boot.spawned.ref` at every spawn, and a `--resume` spawn carries the prior
  record's ref forward (case=4)
- **b.** this pr writes the ref; a resume takes the current boot as its baseline, as under #713, and the
  carry-over lands in a dedicated follow-up pr

## .taken = a

without it, a resumed clone's delta is computed against the wrong baseline and comes out empty: the
drift is missed with no word. (b) keeps #713's behavior, so it is no regression, but it ships a surface
that looks complete and is not. `rule.forbid.deferrals-short-of-a-dedicated-pr` allows (b) only as a
dedicated pr.

## .rework = clean

the carry-over is one lookup at the resume spawn (the prior record by session) and one file copy; no
caller depends on it.

## .confidence = 65%, why

the deadline is the same day. the lookup of a clone record by session id is unread here; if it costs
more than an hour, (b) is the honest call, and the wisher should say so.

## .verdict

ruled 2026-11-17 (S1): in this pr only if the pr is green by the F7 gate (2026-11-18); else a dream,
landed in the done-gate commit.

the lookup by session cost under an hour (a history link per session, read by `lstat`), so (a) was
built before the commit switch. the gate closed with the pr not yet green, so it came out of this pr
and lands as `.dream/v2026_11_17.feat.resume-carries-its-session-boot-revision.md`.
