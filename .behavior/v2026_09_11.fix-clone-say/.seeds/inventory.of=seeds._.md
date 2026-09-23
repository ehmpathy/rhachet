# seeds — v2026_09_11.fix-clone-say

verbatim wisher utterances that changed the work, one entry per utterance.

## .the axis

`case` — one occurrence per utterance, in the order they arrived.

## .the entries

| case | when | what it settled |
|---|---|---|
| S1 | 2026-09-13 | the brain-cli input **triple** (buffered · enqueued · released), `say`-leverages-`get`, the `--await enqueue`/`--await release` capability, the dirty-buffer `--force`, and the mandate to enbrief the triple |
| S2 | 2026-09-13 | `whoami`/`get` should report the brain **model**; it can change mid-run via `/model`, so the report needs the **current** model — env (`ANTHROPIC_MODEL`) is launch-frozen and stale after a switch, so the current-model read rides `clone get` (a `[research]` item) |
| S3 | 2026-09-13 | the TUI-scrape is bounded by a **pinned brain-cli version**, so it is stable; when the pin lifts, the diffs eject into the **adapter pattern already begun** — so the awkward is a bounded fix, not an open-ended fragility |
| S4 | 2026-09-20 | the enroll-mode axis is **INTERACTION**, and the third mode's word is **`await`**, never `oneshot` — `--resume` means no enroll is ever one-shot, so what is bounded is the ENROLLER'S WAIT. also refused: a tty-only default, which would await a session that never exits |

## .the gaps

- none yet.
