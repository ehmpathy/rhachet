# requirement: an init that fails part way leaves no hooks for roles not enrolled

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

when one role's init fails in `rhx init --roles a,b,c`, the repo actor's `settings.of.repo.json`
holds no hook of a role that did not finish enrolment. a later `rhx enroll claude` therefore meets
no hook it would refuse on, and a rerun of the same `rhx init --roles …` after the cause is fixed
converges.

## .clamp

partial. in absolute mode under `--hooks`, a role init that fails part way is caught, the boots and
hooks sync to the roles linked on disk, and the fault rethrows with the linked and unlinked sets
named (`invokeInit`, `asRolesPartWayFaultError`).

owed, each on a call that is the commander's:

- incremental mode (`--roles +x`) — blueprint question B2
- a run with no `--hooks` prunes no hook — fulcrum F2
- the role whose init failed keeps its link, so its hooks stay — fulcrum F1. as worded above ("no
  hook of a role that did not finish enrolment") this requirement reads against F1
- `rhx upgrade` part way — not yet asked

## .proof

- `blackbox/cli/init.preflight.acceptance.test.ts` [case3] — a fresh clone whose first role init
  fails: no hook is left for the unlinked role
- `src/domain.operations/init/roles/link/asRolesPartWayFaultError.test.ts` — the error class follows
  the cause
- owed: the rerun-converges half, and each owed clamp above

## .source

the director, 2026-10-25, for `ehmpathy/rhachet#657`: driver, behaver, learner and dispatcher hooks
landed before the mechanic init failed, then `rhx enroll claude --as @:mechanic` refused on them.
