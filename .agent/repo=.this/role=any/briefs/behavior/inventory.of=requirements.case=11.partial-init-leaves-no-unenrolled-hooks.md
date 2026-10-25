# requirement: an init that fails part way leaves no hooks for roles not enrolled

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

when one role's init fails in `rhx init --roles a,b,c`, the repo actor's `settings.of.repo.json`
holds no hook of a role that did not finish enrolment. a later `rhx enroll claude` therefore meets
no hook it would refuse on, and a rerun of the same `rhx init --roles …` after the cause is fixed
converges.

## .clamp

owed.

## .proof

owed.

## .source

the director, 2026-10-25, for `ehmpathy/rhachet#657`: driver, behaver, learner and dispatcher hooks
landed before the mechanic init failed, then `rhx enroll claude --as @:mechanic` refused on them.
