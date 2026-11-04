# F13 — requirement 1 (`rhx init --roles -xyz`) under a manifest

- **fork** — main's `inventory.of=requirements` entry 1 says `rhx init --roles -xyz` (and bare `rhx init -xyz`) drops `xyz` from `prepare:rhachet`. under a manifest the roles live in `actors.yml`, and F6 refuses `--roles` beside a manifest. (a) refuse the flag under a manifest, name the `actors.yml` edit, and ask the wisher to amend entry 1 to "with no manifest" · (b) honor it: rewrite `actors.yml` to drop `xyz` from every actor that lists it · (c) honor it as a one-shot unlink, and let the next prepare restore the role as short drift
- **taken** — (a). (b) has rhachet write a hand-authored manifest, which this vision never does (the concurrency check rests on "rhachet never writes the manifest"), and it cannot drop a role an actor inherits from a published base. (c) is undone by the next prepare, which is a surprise. only the wisher may change a requirements entry, so the amendment is asked, not assumed
- **rework** — clean — one refusal message, or one manifest writer
- **confidence** — 70% — the wisher may prefer (b), since entry 1 is marked 🔴
- **where** — contract row *behavioral requirements*; inventory rows 19, 41; edgecases
- **verdict** — unruled; **needs the wisher** to amend requirement 1 or pick (b)
