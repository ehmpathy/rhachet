## .what

`rhachet-brains-openai@0.3.1` pins the `openai/codex` slug to `gpt-5.1-codex-max`. the ehmpath test key gets a 404 for it:

```
unexpected status 404 Not Found: "The model `gpt-5.1-codex-max` does not exist or you do not have access to it."
  at invokeCodex (rhachet-brains-openai@0.3.1/dist/index.js:1459)
```

## .why

rhachet keeps twelve `openai/codex` integration cases skipped (`actorAsk`, `actorAct`, `invokeAct`,
`genActor.brain.*`). they cannot run until the slug resolves to a model the test key reaches.

## .the shape of the fix

1. pin `openai/codex` to a codex model that is generally available, or confirm the key needs a grant
2. release; rhachet then bumps the dep, removes the twelve skips, and runs those files scoped

seen in ehmpathy/rhachet, route `v2026_10_15.fix-split-layout-local-settings-arrow`, stone 5.3.
