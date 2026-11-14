# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | path of actors.yml | clean | **ruled** — `.agent/actors.yml`, a peer of `keyrack.yml` (S1) | — |
| F2 | a named roleset IS a published actor (`@repo/slug`), not a new noun | dirty | unruled — best guess taken | 85% |
| F3 | published actors live in `rhachet.repo.yml` `actors:`, emitted by `repo introspect` | clean | unruled — best guess taken | 80% |
| F4 | drift `extra` is kept + reported, never auto-removed | clean | unruled — best guess taken | 85% |
| F5 | the default actor also drives the repo brain dir and bare enroll | clean | **superseded** — main's repo actor settles it; F12 carries the rest | — |
| F6 | init with a manifest links the union of all actors' roles | clean | unruled — best guess taken | 75% |
| F7 | which namespace an enroll lands in | clean | **ruled** — the form decides: actor form → `actor.via.slug=<slug>`, inline form → hash (S4) | — |
| F8 | how a non-repo actor is reached | clean | **ruled** — `rhx clone @scholar`, aliased `rhx enroll @scholar`, no brain typed (S2) | — |
| F9 | a role package may not declare a default actor; `repo introspect` refuses one | clean | unruled — best guess taken | 75% |
| F10 | a brain or role deltas beside `@<slug>` | clean | **ruled** — allowed as overrides; spawns a delta clone (S5). a plain role list beside `@<slug>` is refused (S6) | — |
| F11 | where an actor's brain comes from | clean | **ruled** — every actor has a brain (S7); it propagates up from a base, and a local `brain:` overrides (S8) | — |
| F12 | under a manifest, the repo actor IS the actor `ambient:` names | clean | **ruled** — top-level `ambient: '@<slug>'`, required always, by name (S9) | — |
| F13 | requirement 1 (`rhx init --roles -xyz`) under a manifest: refused, names the `actors.yml` edit | clean | **ruled** — the director, 2026-11-14: keep the guess; listed in the pr body for the commander's review | — |
| F14 | under a manifest, the repo actor keeps the authorless (hand-added) hooks in its own file | clean | unruled — best guess taken | 85% |
| F15 | an actor dir whose base slug left `actors.yml` is kept, and named in the drift report with its fix | clean | unruled — (b) built, on a peer's blocker | 85% |
| F16 | init composes enroll's actor derivation (`asActorFormEnrollment`), never a copy | clean | unruled — best guess taken | 80% |
| F17 | the repo actor exid is read from `actors.yml` per op, not once per run | clean | unruled — best guess taken | 75% |
| F18 | an actor names at most one `@ref` base; the vision's two-base row awaits the wisher | clean | unruled — best guess taken | 70% |
| F19 | the collect-or-throw catch stays per sweep here; the shared helper is its own change | dirty | unruled — a planned dedicated pr, ehmpathy/rhachet#746, with F21 (no dream) | 80% |
| F20 | a brain override beside `@<slug>` is `--brain`, not a positional token | clean | **ruled** — the director, 2026-11-14: keep the guess; listed in the pr body for the commander's review | — |
| F21 | six shape moves around the actor sweeps ride their own change | dirty | unruled — a planned dedicated pr, ehmpathy/rhachet#746, with F19 (no dream) | 80% |
| F22 | the samecwd spawn floor and `test.acceptance.credfree` ride this change; the route asked for each | clean | unruled — best guess taken | 75% |
| F23 | the actor form's success paths are proven at integration, refusals snapped; no spawn per form | clean | **ruled** — the director, 2026-11-14: take the guess | — |
| F24 | an actor's brain is read per spawn, never recorded; `rhx upgrade` now re-links what `actors.yml` declares | clean | unruled — best guess taken; i006 reversed the upgrade half: upgrade reads the manifest (row 52) | 80% |
| F25 | a role focus (`role::subject`) in `actors.yml` is refused with a named hint, not supported | clean | **ruled** — the director, 2026-11-14: keep the guess; listed in the pr body for the commander's review | — |
| F26 | ten extant `runIf` gates (8 perf, 2 paid-brain stitchers) stay outside this change; caught as a dream | clean | unruled — best guess taken | 75% |
| F27 | `asActorsDriftReportLines` stays a data-driven caselist test, not given/when/then | clean | unruled — best guess taken | 80% |
| F28 | the repo-actor carry names the one human-owned layout file it copies; the rest of the former dir stays, unlisted | clean | unruled — best guess taken | 75% |
| F29 | `rhachet init --mode plan` stays cut: the vision scoped it a *could*, cut if it costs more than a flag | clean | unruled — best guess taken | 80% |
