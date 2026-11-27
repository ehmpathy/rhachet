# F2 — the wire timeout sits at a fixed floor, not the rows' max

## .the fork
- a: keep `max(rule timeouts) + margin` per event (today)
- b: `max(max(rule timeouts), floor) + margin`, floor = 60 s
- c: omit the timeout; take claude's default (600 s; 30 s on UserPromptSubmit)

## .taken = b, why
under a, a new row with a longer timeout than the event's max moves the wire's timeout, so the sync writes settings: the exact dependence the wish removes. under a, an event with zero rows has no max at all. the floor 60 is the live max (PreToolUse and Stop wires read 65 = 60 + 5 in `settings.of.repo.json`). the wire timeout is a cap only: the dispatcher kills each rule at its own timeout, so a higher cap adds no wait. c drops the margin invariant (`constants.ts:34-37`) and sits at 30 s on UserPromptSubmit.

F3 forces a floor of some value: a zero-row event feeds `Math.max(...[])` = `-Infinity` to today's
formula (`asHookDispatchersOfRules.ts:34-36`). the open choice is only its value.

## .rework = clean, why
one constant.

## .confidence = 85%, why lower
the wish names the matcher only; this widens scope by one constant, on the reason above. a row over 60 s still moves the wire.

## .where
`constants.ts` (`HOOK_DISPATCH`), `asHookDispatchersOfRules.ts`
