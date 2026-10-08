# S18 — an unmaintained `.this` boot fails fast, on its own

- **raised** = 2026-09-27, at `5.1.execution.from_vision`, after the backfill of `role=any` budgets
- **kind** = contract — it adds a caller-visible gate and reverses `S14` for one population

---

## .said

asked earlier where a `.agent/repo=.this/role=any` breach would be caught, the drive answered: an
`onStop` hook, by default, for `.this` roles only. the wisher then said, in sequence:

> yep, lets just verify and dogfood the .agent/repo=.this onStop hooks are automatically added and
> automatically failfast and catch .agent/repo=.this boots that exceed budget

> this is the most critical dogfood

> catch the seed and do so now and also clamp via acceptance tests with snapshots against this exact
> journey too

> this is the biggest case of hazard

> cause its so typical for .agent/repo=.this dirs to grow unbounded without maintenance of their
> boot.yml

> and thats the biggest cause of headache for us

> so we gotta ensure that it fails fast if folks forget to maintain the budget

---

## .settled

**the one hazard this behavior exists for is an `.agent/repo=.this` dir that grows while its
`boot.yml` does not.** nobody forgets on purpose; the briefs accrete, the boot swells, and no one
looks. so the gate must need no one to look:

| the property | what it means |
|---|---|
| **automatic, to install** | no human adds the hook. a declared `.this` budget arms rhachet's one built-in gate, relayed by `init --hooks` (`S20`) |
| **automatic, to fire** | it runs at `onStop`, unprompted, every session that touches the repo |
| **fails fast** | an owned `.this` spec over its budget holds the stop and names the remedies |
| **silent when within budget** | a spec under its cap says naught, so the hook costs no session a line |
| **own specs only** | a `(linked)` spec is never refused — `S4` / requirement 8 hold |
| **a budget always present** | a `role=any/boot.yml` with no budget is findserted to `5_000`, so the gate always has a cap to hold |

🔴 **this reverses `S14` for one population, and says why.** `S14` cut a hook that rendered the
repo-wide roster into every stop — noise on a question the session never posed. the reason was
**noise**, not the hook. a hook that is silent under budget and speaks only on a breach the session's
own edits caused poses no unasked question: the breach IS the question.

| | `S14`'s hook | `S18`'s hook |
|---|---|---|
| population | every spec, repo-wide | `.agent/repo=.this` specs only |
| under budget | a roster, every stop | silence |
| over budget | a roster | 🔴 holds the stop, names the remedies |

🔴 **and the clamp is the exact journey, end to end**: a repo whose `.this` boot grows past its
budget, a session that stops, the hook that fires on its own and refuses — asserted in an acceptance
test with snapshots, so the next change that breaks any link of that chain goes red.

---

## .landed

- `src/domain.operations/init/boots/findsertRepoThisRoleAnyBootGuard.ts` — the budget findsert
- `src/domain.operations/brains/getAllRepoThisRolesWithHooks.ts` — the built-in gate, armed by a budget (`S20`)
- `src/domain.operations/boot/getOneRepoThisBootBudgetVerdict.ts` — the memoized verdict
- the three `*.integration.test.ts` beside them
- the acceptance journey test, with snapshots
- `blackbox/.test/assets/with-roles-package/index.js` — the fixture hook, `--manifest`
- `.agent/repo=.this/role=any/boot.yml` — this repo's own ratchet, `15_000`
- `rule.forbid.framework-owned-hooks.md` · `rule.require.when-names-the-caller.md` — the worked case
- `S14` narrowed: its cut stands for the roster, and falls for the silent `.this` gate
