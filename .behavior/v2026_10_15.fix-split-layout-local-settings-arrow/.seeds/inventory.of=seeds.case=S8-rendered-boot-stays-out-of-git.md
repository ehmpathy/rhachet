# seed S8 — the rendered boot stays out of git; `rhx init` is the precondition

## .said (2026-10-16)
> boot.md must stay out of git. thats true

> thats an invariant. too much churn otherwise

> so rhx init is mandatory before even ambient repo actor is accessible

## .settled
- `boot.md` is never tracked, in any actor dir, the repo actor's included — a tracked render churns on
  every role upgrade
- `rhx init` is mandatory before any actor is reachable, the ambient repo actor included;
  `prepare:rhachet` runs it on each install
- this is an invariant, enbriefed so it is not reopened

## .landed
- `define.invariant.rendered-boot-stays-out-of-git`
- `define.invariant.unenrolled-claude-is-ambiently-enrolled` (scope: holds from the first `rhx init` on)
