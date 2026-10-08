# F59 — must a named transformer's own body be split further?

- **raised** = 2026-09-30, at `5.1.execution.from_vision`, `review.peer i011` — `mech-decode-friction`
  nitpick.4 (`getAllNamesNearby` in `getAllNearbySpecPaths.ts`)
- **rework** = clean
- **status** = OPEN — **no split**
- **confidence** = **82%**

## .the fork, stated fairly

| | **extract the order** (`getAllNearMatchOffers`) | **keep the pipeline in the helper** (taken) |
|---|---|---|
| the rule | `rule.require.named-transformers` — decode friction goes behind a name | the same rule — its scope is the ORCHESTRATOR. `rule.forbid.inline-decode-friction` grades "decode-friction inline in orchestrator" |
| where the pipeline sits | inside a helper | inside a helper whose docblock names the whole decision: filter, score, threshold, sort, cap |
| the call site | — | `getAllNearbySpecPaths` reads `getAllNamesNearby({ names, nameTyped })`: one named call |
| cost | a second name that wraps the first one's whole body | none |

## .the call, and why

**no split.** the helper IS the extraction the rule asks for. its caller reads one named call, and
the helper's body is the one place the near-match order is spelled out. a further extraction would
name the same decision twice, with one name that only forwards to the other.

## .why the confidence is 82%

six stages is long, and a reviewer may still want the score step (`{ name, distance }` then the
threshold) named apart from the order step (sort, cap). that split is real, but it is a readability
call inside a transformer, not the orchestrator friction the rule targets.

## .rework

clean — split into `getAllNamesWithinDistance` and `asNamesNearestFirst`, and let
`getAllNamesNearby` compose them.
