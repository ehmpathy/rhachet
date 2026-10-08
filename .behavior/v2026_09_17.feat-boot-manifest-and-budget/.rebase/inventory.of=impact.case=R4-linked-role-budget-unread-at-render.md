# R4 — a linked role's budget is unread at render

**status:** 🔴 broken

`setBrainDirBoot.ts:36` renders each role via `getOneRoleBootContent`, which parses `boot.yml`
(so a `budget` key is accepted) but never measures it. a linked role whose supplier forgot
`repo introspect` — or whose consumer edited its `.agent/` copy — renders into `boot.md` over budget.

closed by R3 option A.
