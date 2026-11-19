# F29 — `rhachet init --mode plan` stays cut

- **fork** — the 5.3 i001 repo-rules lane (blocker.1) reads the `--mode plan` cut as found work
  deferred. (a) build `init --mode plan` · (b) keep it cut
- **taken** — (b).
  - it is not found work. the vision itemized it before any code, as row 35 of
    `1.vision.experience.case=_.md`: *"a could, not a must (contract row drift); … it is cut if it
    costs more than a flag"* — a scope call made at the vision, in the wish's own terms
  - the wish asks that drift is reported, never that it is previewed. every manifest-driven
    `rhachet init` prints declared vs linked first (`🎭 actors.yml`), so a preview would add a
    second path to the same answer
  - `init` has no plan/apply split today; one would need a plan mode threaded through the link,
    boot, hook and prepare steps — far more than a flag
- **rework** — clean — a new flag; no extant behavior changes
- **confidence** — 80%; a human may want to see the drift before a relink writes
- **where** — `5.1.execution.from_vision.yield.md` (the cut note); case=6 `[t1]` (the sketch)
- **verdict** — unruled
