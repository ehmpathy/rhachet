# F3 — full width only on `GITHUB_ACTIONS=true`

- **the fork**: key the width on `CI` (the issue's suggestion), on the `LOCALLY=true` the local package command sets, or on `GITHUB_ACTIONS`
- **taken**: `GITHUB_ACTIONS=true` widens; every other host is a shared box
- **why**: `test.acceptance.credfree` sets `CI=true` on laptops, so `CI` would undo the fix on the main local path; `LOCALLY` is opt-in, so a bare `npx jest` would default to wide — the unsafe box
- **rework**: clean — one condition
- **confidence**: 95% — every workflow job runs on a github-hosted `ubuntu-*` runner (`.github/workflows/*.yml`), which sets `GITHUB_ACTIONS`; a future self-hosted runner would err safe (narrow)
- **where**: yield lever 1; case 9
- **verdict**: confirmed by the director, 2026-11-15 — full width only on `GITHUB_ACTIONS=true`
