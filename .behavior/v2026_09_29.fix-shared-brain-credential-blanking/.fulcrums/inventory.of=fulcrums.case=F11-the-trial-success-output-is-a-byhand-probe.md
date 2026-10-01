# F11 — the secstore trial's success output is a byhand probe, never a suite snapshot

## .the fork

`claude.cli.secstore.trial` renders its point on the happy path: five scenario rows, each a real claude-code run against a fake home. its success output may (a) stay unsnapped, a byhand probe, with every refusal and `--help` snapped; or (b) be snapped with the volatile spans masked.

## .taken, and why at the time

(a), for the trial only. `claude.cli.strings` took (b): its success and zero-match output are now snapped against a fake package in the repo.

- the trial's rows ARE the output of a real claude-code install and a live oauth endpoint. the `write.*` rows exist to report what claude-code does after the server rejects a fake refresh token: `claude said:`, which file went blank, what each dir holds. a mask over those spans masks the whole verdict; what remains is a frame of static `echo` lines, and a snapshot of that proves no behavior
- to snap it live, the suite would install claude-code and spend a network round trip to anthropic's oauth endpoint on every run, and the snapshot would move with each claude-code release's text. the verdict the trial reports is already proven, in the suite, by `enroll.shared-brain-auth.acceptance.test.ts`, which asserts the same fact (the clear lands in `~/.claude`, the brain dir holds no login) through rhachet's real spawn
- the trial is a dev tool for a mechanic who asks "where does claude-code write?", in this repo's own `.agent/repo=.this/role=any/skills/`. no caller parses its output

## .rework

clean — a masked frame snapshot is additive.

## .confidence, and why it is low

80%. the frame's words can drift unseen. that drift is cosmetic: the trial is read by a human who runs it on purpose.

## .where

`.agent/repo=.this/role=any/skills/claude.cli.secstore.trial.sh`; `claude.cli.skills.integration.test.ts`; review i002 r008 blocker.1, r009 blocker.2.
