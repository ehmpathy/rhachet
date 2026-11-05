# S2 — the execution and verification yields belong in the pr

## .said

> wheres the yield? was 5.1 and 5.3 not done?

(pr #691 review, 2026-11-04, on the prior route's `5.1.execution.from_vision.guard`)

## .settled

- the reviewer reads the route's yields in the pr diff; a route left out of the diff reads as work not done
- the nano route, with its 5.1 and 5.3 yields, is committed to the pr; the superseded `v2026_11_01` route is removed from it

## .landed

| what | where |
|---|---|
| nano route committed | `.behavior/v2026_11_03.fix-tests-mock-the-claude-cli.nano/` |
| prior route removed | `.behavior/v2026_11_01.fix-tests-mock-the-claude-cli/` |
| fulcrum | `.fulcrums/inventory.of=fulcrums.case=F8-the-nano-route-rides-the-pr.md` |
