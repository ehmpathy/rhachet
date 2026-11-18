# F15 — the `$$` scan reads the rule file at run, never at sync

## .the fork

a bash rule that reads `$$` must run as its own process, never sourced. where is that decided?

- **(a)** at run: the dispatcher reads the file to source it, and the same read checks for `$$`
- **(b)** at sync: typescript scans the file and writes the verdict into the manifest as a kind

## .taken

(a). the dispatcher already reads the whole file at run, because it sources that text. a check on
that same text cannot go stale. a sync verdict goes stale the moment a role upgrade edits the file
without a re-sync, and a stale "safe to source" makes a `$$` rule read the dispatcher's pid.

(b) also costs a manifest format change (a new kind, so a v2 header), for a check that costs no
extra read at run.

## .rework

clean: a new kind written by `getOneHookDispatchRuleOfBrainHook`, read by the run branch, plus a v2
header. no caller is hardened against (a).

## .confidence

85%. the testability argument for (b) is real; the clamp for (a) is acceptance `[t16]`, which goes
red if a `$$` rule is sourced.

## .where

`bin/hooks.dispatch.sh` (run branch); `blackbox/cli/hooks.dispatch.acceptance.test.ts` `[t16]`

## .verdict

open, for the director at the pr.
