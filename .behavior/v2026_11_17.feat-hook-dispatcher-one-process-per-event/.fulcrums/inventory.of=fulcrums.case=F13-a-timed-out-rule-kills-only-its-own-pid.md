# F13 — a timed-out rule kills only its own pid; a child it forked runs on

## .the fork

two reviews pull opposite ways on a timed-out rule's children.

- **(a)** the watchdog kills only the rule's own pid (the subshell the dispatcher forked); a child
  the rule forked runs on, as a child of a timed-out hook did under claude
- **(b)** `pkill -TERM -P <pid>` first, so the rule leaves no child behind
- **(c)** run each rule in its own process group (`set -m`) and kill the group by negative pid

## .taken

(a). `rule.forbid.unscoped-process-kills` names `pkill -P` and allows no narrow form, so (b) is out.
(c) turns on job control in a non-interactive bash, which changes how each background job is
reported and reaped; a byte drift there would break the "each rule decides as before" bar this work
is held to. the rule's own steer holds: a leftover child is idle and costs no budget. claude itself
does not kill a timed-out hook's children, so (a) matches the behavior before the dispatcher.

## .rework

clean: one line in the watchdog, if a process group lands later.

## .confidence

85%. (c) may prove byte-safe under a probe; it was not measured in this round.

## .where

`bin/hooks.dispatch.sh` (watchdog)

## .verdict

open, for the director at the pr.
