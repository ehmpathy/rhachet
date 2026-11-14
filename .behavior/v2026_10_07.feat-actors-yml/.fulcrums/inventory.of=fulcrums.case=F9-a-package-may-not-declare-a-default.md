# F9 — a role package may not declare a default actor

- **fork** — a package's published set carries a `default:` (a "recommended" actor a consumer inherits unless it names its own), vs the default is only ever the consumer repo's, and `repo introspect` refuses a package `default:`
- **taken** — refuse. the default answers *"what does a bare enroll mean in THIS repo"*, which only the repo can know; a package-side default would also collide when a repo installs two packages that each declare one
- **rework** — clean — loosen the introspect validator and add one precedence rule (repo > package); no artifact shape changes for extant consumers
- **confidence** — 75% — a "recommended actor" per package is a plausible want (e.g. ehmpathy recommends `@builder`), surfaced by the peer review's hidden-dimension check rather than by the wish
- **where** — inventory row 29; dimensions, the hidden-dimension check; contract row "where a published actor lives"
- **verdict** — unruled
