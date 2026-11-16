# F11 — the measure skill reads the box through the suite's own reader

## .the fork

`measure.acceptance.share` needs cpu psi and load. it may import the acceptance suite's reader and
fold (`blackbox/.test/infra/getOneBoxPressureNow`, `asPeakPressure`, `asTreeBranchGlyphs`), or
carry its own copy. one review round asked for the reuse (mech-decode-friction r003 blocker.7: the
skill's own psi regex duplicated `asCpuPsiSomeAvg10`); the next round flagged the import as a skill
that reaches into test infra (arch-smell-scopeleaks i002 r005 blocker.1). the two ask opposites.

## .taken, and why

import. the skill is not a runtime skill of the product: it measures the acceptance suite, and
exists only to turn the suite's width into a number. the reader it imports is the very one the
suite's starved note grades the box with, so the measure and the note read one box one way. a copy
would let the two drift — the defect r003 named. the import is one way, test tool to test infra,
and no prod source reaches it.

## .rework

clean — copy three small operations into the skill's own dir and drop the import; no caller moves.

## .confidence — 75%, why not higher

`.agent/` skills are pavement any traveler may run, and a reader may hold that pavement should
stand on its own, with no reach into `blackbox/`. the wisher may prefer the readers moved to a
neutral home both import.

## .where

`.agent/repo=.this/role=any/skills/measure.acceptance.share.ts`,
`.agent/repo=.this/role=any/skills/measure.acceptance.share/asMeasureTree.ts`.

## .verdict

confirmed (director, 2026-11-16) — the measure skill imports the suite's own box reader.
