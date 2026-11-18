# F7 — a rule times out at the timeout its role declares

## .the fork

the claude adapter writes a role hook's timeout into `settings.json` in milliseconds
(`rhachet-brains-anthropic/src/hooks/translateHook.ts:40`, `PT30S` → `30000`). claude reads a hook
`timeout` in seconds, so before this change a rule declared `PT30S` ran under a ~30000s limit — in
effect, none. the dispatcher's per-rule watchdog can:

- **(a)** enforce the declared timeout, in seconds (`PT30S` → 30s): the role author's intent
- **(b)** mimic the old effect: the declared number of milliseconds read as seconds, or no per-rule
  limit at all

## .taken

(a). the manifest stores `asTimeoutSecondsOfBrainHook(declared)`; a rule past it is killed with code
124 and a `💥 MalfunctionError: hook rule timed out` notice, a non-block. claude's own limit on the
dispatcher sits 5s above the slowest rule's.

## .rework

clean. (b) is the seconds value in `getHookDispatchRuleOfBrainHook.ts` multiplied by 1000, or the
watchdog skipped.

## .confidence

85%. the wish asks that every rule decide as today. a rule that ran longer than its own declared
timeout decided before and is now cut off as a crash (exit 124, a non-block). no live rule is known
to run that long (the per-call read shows the whole event at ~1.3s of cpu), and (b) would carry an
adapter defect forward as a contract. the adapter's unit is a separate defect, owed upstream.

## .where

`src/domain.operations/brains/dispatch/getHookDispatchRuleOfBrainHook.ts` · `bin/hooks.dispatch.sh`
(the watchdog)

## .verdict

open, for the director at the pr. listed in the pr's known differences.
