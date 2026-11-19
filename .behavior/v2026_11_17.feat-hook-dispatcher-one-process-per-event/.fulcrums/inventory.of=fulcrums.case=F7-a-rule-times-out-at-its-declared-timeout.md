# F7 — a rule times out at the timeout its role declares

## .the fork

the dispatcher runs every rule of an event in one process, so claude's per-hook limit now bounds
the whole event, not each rule. the per-rule limit must come from the dispatcher. its watchdog can:

- **(a)** enforce each rule's declared timeout, in seconds (`PT30S` → 30s)
- **(b)** enforce no per-rule limit, only claude's limit on the dispatcher

## .taken

(a). the manifest stores `asTimeoutSecondsOfBrainHook(declared)`. a rule past it is killed with code
124 and a `💥 MalfunctionError: hook rule timed out` notice, a non-block. claude's own limit on the
dispatcher sits 5s above the slowest rule's.

(a) is what each rule had before. the published claude adapter (`rhachet-brains-anthropic@0.4.3`,
`dist/domain.operations/hooks/translateHook.js:41`) writes a role hook's timeout in seconds, and claude
read it in seconds. so a rule declared `PT30S` was cut off at 30s before, and is cut off at 30s now.

## .rework

clean. (b) skips the watchdog in `bin/hooks.dispatch.sh`.

## .confidence

95%. the limit per rule equals the limit claude applied per hook before. the residue: claude's kill
and the watchdog's kill may differ in signal and in what the transcript shows for the cut rule
(exit 124 plus a notice, here).

## .where

`src/domain.operations/brains/dispatch/getOneHookDispatchRuleOfBrainHook.ts` · `bin/hooks.dispatch.sh`
(the watchdog) · `src/domain.operations/enroll/setActorSettingsDerived.ts` (reads a settings timeout
in seconds, clamped by its [case4])

## .verdict

taken; the premise of an earlier draft (an adapter that wrote milliseconds) held only for the
unpublished `src/_topublish` copy, never for the shipped adapter.
