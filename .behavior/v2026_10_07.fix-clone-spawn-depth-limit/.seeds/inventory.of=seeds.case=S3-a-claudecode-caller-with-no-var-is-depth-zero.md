# seed S3 — a claude-hosted caller with no depth var is depth 0

## .said

> F1 — "wouldnt that be clone depth 0? given that we want the first clone level be able to dispatch 1 level of subclones?"
>
> F5 — "drop them (Recommended)"
>
> nitpick gate — "top up a reviewer"

## .settled

- a caller with `CLAUDECODE=1` and no `RHACHET_CLONE_DEPTH` is a depth-0 caller: the first clone
  level. it may dispatch one level of subclones, and each subclone is depth 1. `CLAUDECODE` is
  never read as a depth signal.
- a repl child drops the parent's serial and socket.
- the 1.vision nitpick gate is cleared by a reviewer round, not an overrule or a raised allowance.

## .landed

- `.fulcrums/inventory.of=fulcrums._.md` (F1, F5)
- `.agent`-side: a budget top-up for `enroll-vision-intent` on 1.vision
