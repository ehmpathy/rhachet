# F54 — may a brain-dir sync WRITE the repo's own `boot.yml`?

- **raised** = 2026-09-28, at `5.1.execution.from_vision`, `review.peer i006` —
  `arch-hazards-behavior` nitpick.3
- **rework** = clean
- **status** = OPEN — **yes**
- **confidence** = **92%**

## .the fork, stated fairly

`syncAndReportBrainDirBoots` (reached by `init`, `upgrade`, `roles link`) calls
`findsertRepoThisRoleAnyBootGuard`, which findserts `budget.tokens: 5_000` into
`.agent/repo=.this/role=any/boot.yml` where a payload is declared and no budget is. it writes no
hook file: the budget alone arms the built-in gate (`S20`).

| | **findsert inside the sync** (taken) | **a separate command** |
|---|---|---|
| a repo gets a budget | on its next `init` / `upgrade` / `link` | only if a human knows to run it |
| the write is visible | ✅ printed: `+ boot.yml  budget.tokens: 5_000` | ✅ |
| an extant budget | never changed | never changed |

## .the call, and why

**findsert inside the sync.** the wisher mandated it: a budget is findserted always, as best
practice, and an extant budget is never changed (S18). the write is created-only-where-absent, and
the sync prints each file it created, so the write is surfaced at the call site the reviewer asks
for.

## .why the confidence is 92%

the wisher settled the behavior; what is left is whether the operation's NAME should say it writes a
spec. `syncAndReport…` already reports it.

## .rework

clean — move the findsert call to each command's entry.
