# S20 — the budget gate is built in, and it is the only framework-owned hook

- **raised** = 2026-10-06, after the route closed, in a review of what the drive had shipped
- **kind** = contract — it removes a file surface (`hooks.yml`) and declares one sanctioned exception to a rule

---

## .said

asked what `hooks.yml` was for, the wisher said, in sequence:

> i dont recall that choice

> when did we agree on a hooks.yml idea? and why do we need it?

offered three options, the wisher chose the built-in one:

> yeah it should just be automatic for all .this roles; this is the only framework owned hook we
> support, and thats just to enforce budgets, which they opt into via boot.yml budgets

then, of a general per-role hooks file as its own feature:

> i see. ok lets just move hooks into a separate pr

> catch as a dream for now

---

## .settled

**a `.this` role opts into the stop gate by the budget it declares in its `boot.yml`, and naught
else.** there is no hooks file. rhachet arms one hook itself, and supports no other:

| the property | what it means |
|---|---|
| the opt-in | a `.this` `boot.yml` with `budget.tokens`. no budget, no hook |
| the hook | `roles cost --all --when hook.onStop`, PT60S |
| armed once | on the first budgeted `.this` role in slug order, since the sweep is repo-wide |
| removable | delete the budget; the next sync prunes the entry as an orphan author |
| the sole exception | `rule.forbid.framework-owned-hooks` names this gate, and no other, as permitted |

🔴 **`hooks.yml` was never a wisher choice.** the drive invented it to avoid a framework-owned hook,
without a seed behind it. a general hooks file for any role is a separate feature, caught as a
dream for its own PR.

---

## .landed

- `src/domain.operations/brains/getAllRepoThisRolesWithHooks.ts` — the gate, armed by a budget
- `src/domain.operations/init/boots/findsertRepoThisRoleAnyBootGuard.ts` — the budget findsert only; no hook file
- `blackbox/cli/init.hooks.boot-guard.acceptance.test.ts` — asserts no `hooks.yml` and the relayed Stop entry
- `.agent/repo=.this/role=any/hooks.yml` — deleted
- `rule.forbid.framework-owned-hooks.md` — `.the sole exception`
- `S18` — its install row amended
