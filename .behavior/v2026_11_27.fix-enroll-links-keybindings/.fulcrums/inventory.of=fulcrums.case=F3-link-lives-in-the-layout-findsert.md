# fulcrum F3: the link rides the layout findsert

## .the fork
- **A** add the link to `setBrainDirSettingsLayout`, which `enroll`, `init`, and the derived-actor sync all run
- **B** add a step to `invokeEnroll` alone, as the wish words it ("beside the login link")

## .taken
A. no login link exists to sit beside: since the cure that retired the 1.48.0 per-actor login, a clone reads `~/.claude/.credentials.json`
via `CLAUDE_SECURESTORAGE_CONFIG_DIR=''` (`invokeEnroll.ts:727-732`). the layout findsert is the one
place that lays every brain-dir arrow, for every actor (`rule.forbid.brain-dir-layout-divergence`).
B would leave the repo actor — an everyday `claude` — without the link until its next enroll.

## .rework
clean — the call moves between two callers.

## .confidence
90%.

## .where
`src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`.

## .verdict
A, confirmed by the director, 2026-11-27, at the 1.vision approval
