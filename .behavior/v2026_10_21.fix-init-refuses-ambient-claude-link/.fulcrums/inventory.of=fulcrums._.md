# inventory.of=fulcrums

axis = `case` (one entry per best-guessed call, in the order made). each one is the commander's to rule
(seed S1: a question that changes the behavior goes to the commander).

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | `case=F1-failed-role-counts-as-linked` — a role whose init failed keeps its link and its hooks | clean | open | 70% |
| F2 | `case=F2-prune-only-under-hooks-flag` — a part-way failure prunes hooks only under `--hooks` | clean | open | 80% |
| F3 | `case=F3-global-rhx-skew-named-not-refused` — a global rhx that differs from the pin is named, never refused | clean | open | 75% |
| F4 | `case=F4-roles-ehmpathy-pin-bump-in-scope` — the `rhachet-roles-ehmpathy >= 1.39.5` bump rides this pr | clean | ruled (a) by the director, 2026-11-02 | 95% |
| F5 | `case=F5-stop-at-first-failed-role-or-continue` — a failed role init stops the loop (extant), rather than the loop goes on | clean | open | 60% |
| F6 | `case=F6-link-refusal-moves-ahead-of-role-loop` — a `.claude` link that aims elsewhere is refused in the preflight, before any role writes through it | clean | open | 65% |
| F7 | `case=F7-blueprint-as-a-yield-with-no-stone` — the blueprint is a route yield, reviewed by hand, with no stone or guard | clean | open | 80% |
| F8 | `case=F8-part-way-init-renders-boots-before-hooks` — a part-way init re-renders the boots, then syncs the hooks, as the clean path does | clean | open | 75% |
| F9 | `case=F9-part-way-resync-without-hooks-flag` — a part-way `--roles` init with no `--hooks` still re-renders the boots, as the clean path does | clean | open | 80% |
| F10 | `case=F10-temp-repo-install-stall-deferred` — a `bun install` stall in shared test infra, under full-suite load, is proven a flake by a solo green run and deferred to a dream, not fixed here | dirty | open | 70% |
| F11 | `case=F11-keyrack-daemon-load-flakes-deferred` — the `unlockKeyrackKeys` clock flakes are fixed by a bracketed clock; the `daemon` suite's load flakes ([case9] [case11]) are deferred to a dream | dirty | open | 65% |
| F12 | `case=F12-execupgrade-unit-preflight-stub-kept` — the `execUpgrade` unit suite stubs the preflight beside its ten extant stubs; its migration off `jest.mock` is deferred to a dream | dirty | open | 70% |
| F13 | `case=F13-preflight-hint-names-rhx-init-on-upgrade` — the shared preflight refusal says "rerun `rhx init`" on the `rhx upgrade` path too, as the vision's case 4 demo reads | clean | open | 60% |
| F14 | `case=F14-openai-test-model-swap-kept` — the shared openai test context keeps `gpt-4o-mini-2024-07-18`: main's `gpt-4-turbo-2024-04-09` now returns a 404 (deprecated), measured 2026-11-02 | clean | settled by measurement | 97% |

gaps: cause 4 (director tree link layout) holds no fulcrum — it is a fact owed by the director, not a call.
