# F8 — how a non-default actor is reached

- **fork** — extend enroll's `--roles` grammar with an `@<slug>` base (`rhx enroll claude --roles @scholar`) vs leave a non-default actor to `rhx clone @scholar`, then out of scope
- **taken** — extend `--roles`, so a second declared actor was reachable at all
- **rework** — clean
- **confidence** — 80%
- **where** — case=8; groundwork row on `@<actor>` grammar
- **verdict** — ruled 2026-10-09, a third path: `rhx clone @scholar` is in scope, `rhx enroll @scholar` is its alias, and no brain is typed since the actor owns its brain (seed S2). the `--roles @scholar` form is dropped; `@<slug>` is the actor form's positional subject (F10)
