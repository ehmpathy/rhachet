# F10 — the mocked repl keeps its no-arg default

## .the fork

`genMockedBrainRepl` gains a strict `output` input. a caller who passes neither `content` nor
`output` gets `{ content: '' }` today.

| option | what it does | the cost |
|---|---|---|
| A. keep the no-arg default; `output` and `content` stay exclusive | 11+ extant unit callers unchanged | a caller who forgets `output` gets an empty reply, not a throw |
| B. throw when neither is given | a forgotten input fails loud | every extant no-arg caller (`brainRepl.continuation.test.ts`, `genContextBrain.test.ts`, others) must change, in a wish about the anthropic api, not the mocked repl's contract |

## .taken

A. the extant callers pass no input on purpose: they test the repl's plumb, not its reply, so an
empty reply is the correct fixture for them. every suite this change moves onto the mocked repl
passes `output` by name and asserts on it, so a forgotten `output` in a moved suite fails that
suite's own assertion rather than pass quietly. B would rewrite unrelated tests for no new proof.

## .rework

clean — B is one throw in the asset and an explicit `{ content: '' }` at each no-arg call site.

## .confidence

80%. the risk is a future caller who means to pass `output` and forgets; its own assertions catch it.

## .where

`3.3.1.blueprint.product.yield.md` — `.codepath tree`, the mocked repl.

## .verdict

best-guessed.
