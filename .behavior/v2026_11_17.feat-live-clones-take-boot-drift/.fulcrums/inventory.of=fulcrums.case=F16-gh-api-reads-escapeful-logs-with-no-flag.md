# F16 · `show.gh.job.log` reads a job log through `gh api` with no escape flag

## .the fork

- **a.** `gh api repos/<repo>/actions/jobs/<job>/logs`, captured into a variable, then stripped of
  escapes by the skill
- **b.** add `--allow-escape-sequences` to the `gh api` call

## .taken = a

the reviewer's premise is that `gh api` refuses a body that holds escapes unless the flag is set.
measured on 2026-11-18 against a jest-colored job log (job 134621027424, run 44250876468):
`rhx show.gh.job.log --job 134621027424 --grep PASS` read 4535 lines and printed the matched rows.
the body is captured into a variable, so gh writes to a pipe, never a terminal, and no refusal fires.
the skill was never handed the flag; the file is new in this pr, so no flag was removed.

## .rework = clean

add one flag to one call.

## .confidence = 90%, why

measured on the gh this host runs; an older gh may differ, and the skill's own `.note` already marks
it interim until the passthrough lands upstream.

## .where

`.agent/repo=.this/role=any/skills/show.gh.job.log.sh`. answers r4.nitpick.5 (round 2).

## .verdict

overturned by ci, 2026-11-19. the ci runner's gh refuses the body even into a pipe: `the response
contains terminal escape sequences; pass --allow-escape-sequences to output it anyway` (job
135395376496). the premise held for this host's older gh only. the skill now passes the flag where
`gh api --help` names it, and omits it on a gh that lacks it — the reviewer's fork **b**, guarded.
