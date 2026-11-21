# F11 — the dispatcher sets no `set -euo pipefail`

## .the fork

the repo's other bash skills set `set -euo pipefail`; the dispatcher does not.

- **(a)** no errexit: the dispatcher reads each rule's exit code with `wait` and routes it; a nonzero
  `wait`, an EOF `read`, or a `[[ ]] &&` guard is data, never a fault
- **(b)** `set -euo pipefail`, with `|| true` on each read and each guard

## .taken

(a). under `set -e`, the first rule that exits 2 would end the dispatcher at its `wait`, before the
merge prints every blocker's stderr; a guard line `[[ -f x ]] && …` that tests false would end it too.
each such line is a decision the merge must make, and the dispatcher's own failures (an absent
manifest) fail closed by an explicit check. a rule runs in its own subshell with default options, so
the choice reaches no rule.

## .rework

clean, but wide: every `wait`, `read` and guard line takes `|| :`.

## .confidence

85%. `set -u` alone is the closest safe step; it is left out because an array of zero rules
(`__rhx_dispatch_pid[@]` when no rule fits) reads as unset on bash < 4.4.

## .where

`bin/hooks.dispatch.sh`

## .verdict

open, for the director at the pr.
