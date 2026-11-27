# F9 — a later row prints the hooks report, not the swap report

## .the fork
vision case=4 [t2] reads "the swap report names the new rule count for PreToolUse". with the wire
whole, a later row rewrites no wire, so `asHookDispatchSwapLines` gates it out
(`dispatchersSet > 0 || roleHooksTakenBack > 0`). the later sync prints only the per-rule hooks report:
`test/tester → anthropic/claude/code: +4` and `✨ hooks └─ 4 created`.
- a: widen the swap gate to "the manifest rows changed", so the per-event `= N rules` leaves print on
  a later row too. this needs a rows-changed signal threaded from the per-rule sync into the swap record
- b: leave the gate; the hooks report already names the rows the sync added, and the human sees it

## .taken = b, why
the change the human needs to see (rows landed, how many) prints today, and an acceptance assert
pins it (`hooks.dispatch.acceptance` [case2] [t1]). the per-event leaf is the finer view, and its
gate ties to F7 (the swap report as the one place a sync names the wire shape). a widened gate is a
report-surface change across every re-sync snapshot, which the director has not yet ruled on.

## .rework = clean, why
one gate in `asHookDispatchSwapLines` plus one field on `HookDispatchSwap`; snapshots move, no caller
hardened against it.

## .confidence = 75%, why lower
the vision cell names the swap report by name. b meets the intent (status shown) but not the letter.

## .where
`src/domain.operations/init/hooks/asHookDispatchSwapLines.ts:16-18`,
`blackbox/cli/hooks.dispatch.acceptance.test.ts` [case2] [t1]
