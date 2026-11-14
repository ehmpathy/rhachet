# F20 — a brain override beside `@<slug>` is the `--brain` flag, not a positional token

- **fork** — the vision's edge table writes the override as `rhx enroll @scholar codex`; its own invocation row writes it as `[--brain <brain>]`. (a) honor a positional brain after `@<slug>` · (b) the override is `--brain` only; a positional token after `@<slug>` passes through to the brain-cli, as for any enroll
- **taken** — (b). under the actor form every token after `@<slug>` is brain-cli passthrough (`getBrainCliPassthroughArgs`), so a positional brain would make `rhx enroll @scholar codex` and `rhx enroll @scholar <prompt>` ambiguous — one word decides whether it is a brain or a prompt. `--brain` carries no such ambiguity, and `asActorFormEnrollment` honors it (test case3). the role-delta override (`@scholar +mechanic`) is built and tested
- **rework** — clean — a positional read in `performEnroll` before the passthrough split, plus one case
- **confidence** — 70%; the vision row is the wisher's text, so it stays flagged, never dropped
- **where** — `src/contract/cli/invokeEnroll.ts` (actor form sets `positionalBrain = null`), `src/domain.operations/enroll/asActorFormEnrollment.ts`; raised by behavior-intent-coverage nitpick.1 (i002)
- **verdict** — unruled; best guess taken, needs the wisher to amend the edge row or rule (a)
