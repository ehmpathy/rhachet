# F21 — a kept json replaces the other rules' stdouts; no additionalContext fold

## .the fork

when one rule prints json and another prints plain text (SessionStart, UserPromptSubmit), or two
rules print json `additionalContext`, the dispatcher's one stdout can carry only one shape. claude
would have concatenated each hook's `additionalContext` across hooks.

- **(a)** keep the json whole and drop the plain text, and pin that drop in a test
- **(b)** fold every plain stdout and every json `additionalContext` into one json

## .taken

(a), pinned by `[t24]`. no live rule emits json on these events:

- the four SessionStart rules print plain text
- no bhrain or mechanic hook emits json context (r011 read the same)

so (b) would build a merge with no case that needs it. the drop is now visible: a test fails the
day it changes.

## .rework

clean: the crash path already folds into `additionalContext` (`bin/hooks.dispatch.sh` merge); the
same fold would cover plain stdout and each json's `additionalContext`.

## .confidence

80%. a role could add a json boot hook. the pin makes that day loud rather than silent.

## .where

`bin/hooks.dispatch.sh` (merge, SessionStart/UserPromptSubmit branch); `[t24]` in
`blackbox/cli/hooks.dispatch.acceptance.test.ts`.

## .verdict

open, for the director at the pr.
