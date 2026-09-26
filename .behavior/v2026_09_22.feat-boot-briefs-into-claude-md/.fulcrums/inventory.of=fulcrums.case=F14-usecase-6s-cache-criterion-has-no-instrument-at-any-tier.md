# F14 — the cache criterion and its instrument

## .fork

a criterion asserted a cache benefit. was there any signal a test could assert against?

| option | verdict |
|---|---|
| a. an acceptance test on cache reuse | ✅ **taken** — the signal exists |
| b. a byte-stability test under the cache name | ❌ necessary, not sufficient — a false green |
| c. declare the gap | ❌ void — there is no gap |

## .verdict — RESOLVED: the instrument exists

`claude -p --output-format json` reports `cache_read_input_tokens`. the journey launches the same
clone config twice and asserts the second read ≥ the corpus.

## .grounds

- the earlier *"no instrument at any tier"* was an unmeasured absence. the cli's own json output is
  the instrument.
- byte-determinism, the half this feature controls, stays asserted separately at integration.
- whether a layer-2 file earns a cache read at all is **M2**. if it does not, the assertion is
  withdrawn from usecase.1 by a measurement, never by a guess.

## .where

- criteria usecase.1 (*"the corpus is billed as a cache read"*) · journey [t3] · blueprint M2
