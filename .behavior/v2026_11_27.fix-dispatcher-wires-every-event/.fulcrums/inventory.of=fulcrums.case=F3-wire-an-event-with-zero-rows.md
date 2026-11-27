# F3 — a mapped event with zero rows still gets its wire

## .the fork
- a: wire all four mapped events whenever a manifest exists, rows or not
- b: wire only events with at least one row, matcher `*`

## .taken = a, why
b leaves the wish's UserPromptSubmit case dark: a row on an event no row held needs a settings write. a zero-row wire costs one bash start per event occurrence (~110 ms cpu, measured), exit 0, no bytes.

## .rework = clean, why
a filter on the event list.

## .confidence = 88%, why lower
a UserPromptSubmit wire with zero rows adds a start to each human prompt; small, but felt per prompt.

## .where
`asHookDispatchersOfRules.ts`
