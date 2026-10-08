# F75 — how does a `.this` role arm the onStop budget gate?

- **raised** = 2026-10-06, after the route closed, by the wisher's review of `hooks.yml`
- **rework** = clean
- **status** = ANSWERED — by the wisher (`S20`)
- **confidence** = **100%**

## .the fork, stated fairly

| | **a `hooks.yml` the role ships** | **a gate rhachet builds in** (taken) |
|---|---|---|
| the opt-in | the hook file, findserted beside the spec | the `budget.tokens` the spec declares |
| what the repo sees | the hook, in a file it can edit | the relayed entry in `settings.json`, `author: repo=.this/role=$slug` |
| the cost | a new file surface no one asked for | one framework-owned hook — a class `rule.forbid.framework-owned-hooks` forbids |

## .the call, and why

**built in.** the budget is already the opt-in; a second file that restates it is a second place to
drift. the wisher named this gate the only framework-owned hook rhachet supports, so the rule gains
one named exception, and no other.

🔴 the drive had shipped `hooks.yml` with no seed behind it — a guess dressed as a settled choice.

## .rework

clean — `getAllRepoThisRolesWithHooks` arms the gate on the first budgeted `.this` role; delete the
budget and the next sync prunes the entry as an orphan author.
