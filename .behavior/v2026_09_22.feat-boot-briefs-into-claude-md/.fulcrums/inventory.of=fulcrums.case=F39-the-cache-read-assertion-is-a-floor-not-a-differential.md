# F39 — the cache read assertion is a floor, not a differential

## .fork

the journey's M2 claim is that a brief load is cache-eligible: the second launch of a clone reads its
corpus from cache. peer r8 found the assertion was `cacheRead > 0`.

| option | |
|---|---|
| a. a floor | `cacheRead >= ceil(bootChars / 4)` — the cached read at least covers the corpus size |
| b. a differential | a baseline clone with an empty corpus, launched twice; the corpus clone must read `baseline + corpus` tokens |

## .verdict — TAKEN (a), 75%, rework clean

(a) now, (b) dreamed. (b) adds two real-haiku launches to a ~10-minute journey. the floor catches a
corpus absent from the prompt; it does not catch a corpus present but outside the cached prefix,
since the claude-cli system prompt alone (~14k tokens measured) clears the floor.

dream: `dreams/v2026_09_24.feat.prove-the-corpus-itself-reads-from-cache.md`.

## .why the confidence is not higher

the floor is weak against the one failure it most wants to catch: a cache break between the system
prompt and the `CLAUDE.md` user message. the documented behavior says that prefix caches, so the
risk rests on the cli, not on rhachet.

## .rework

clean: (b) is additive in the journey test; no shipped code changes.

## .where

- `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` — the M2 `then`
- `.dream/v2026_09_24.feat.prove-the-corpus-itself-reads-from-cache.md`
