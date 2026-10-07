# fulcrum F47 — spawn the skill's `.ts` directly, or lose the malfunction clamp

- **rework** = clean
- **status** = `[author]` — ANSWERED: **spawn directly**, documented at the site under the rule's
  own exception clause
- **confidence** = 94% — the alternative is closed by a measured property of the skill, not by an
  estimate of effort
- **where** = `blackbox/cli/get.package.format.acceptance.test.ts:293-328`

## .the fork

`rule.require.acceptance.blackbox` requires the **action** of an acceptance test go through the
contract — `rhx get.package.format` — and grades a direct call to an internal a blocker. `[case8]`
spawns the skill's `.ts` instead.

| the option | what it buys | what it costs |
|---|---|---|
| 🔴 **spawn the `.ts` directly** (taken) | the malfunction exit is reachable and clamped | the action is not through the contract; the deviation rides on a documented exception |
| invoke `rhx` from the temp dir | contract purity | 🔴 **a false green** — see below |
| drop the case | rule purity | the exit-1 branch this behavior ADDED goes unclamped |

## 🔴 .why the `rhx` option is worse — two cwd-relative reads, not one

the fixture is a malformed `package.json` inside a temp dir's `node_modules`. it bites only from
that dir, because the skill reads `process.cwd()/node_modules`. so the invocation must run from
the temp dir.

🔴 **but the skill LOOKUP is cwd-relative too.** `rhx` from a temp dir finds no `.agent/` tree,
refuses with *"no skill found"*, and exits **1** — the exact code `[t0]` asserts, for an entirely
unrelated cause.

⇒ the `rhx` option does not merely fail. **it passes the assertion while it proves naught**, which
is `rule.forbid.failhide`'s own shape. a rule followed into a false green is worse than a rule
deviated from with a record.

## .what the `.sh` half contributes on this path — no unpinned behavior

the wrapper validates `--package` and execs. every arm of that validation is pinned through the
real contract already:

| the arm | pinned by |
|---|---|
| no `--package` at all | `[case2]` |
| an absent value for `--package` | `[case3]` |
| an unknown argument | `[case6]` |
| a package that is not installed | `[case7]` |

⇒ the direct spawn skips no behavior the contract owns. it reaches one branch **inside the `.ts`**
that the wrapper cannot influence.

## .the rule's own exception clause is satisfied

`rule.require.acceptance.blackbox` (with `rule.forbid.acceptance.mocks`'s parallel clause) permits
a deviation where the circumstance is unavoidable **and** documented inline where it is declared
and used. both hold — the note sits at `:285-291`, names the cause, names why the alternative
fails, and names the four cases that cover the wrapper.

🟡 **and the reviewer that raised it already granted the first half.** `mech-test-scope-purity`
nitpick.1 calls the tradeoff *"defensible"* and *"honestly justified"*, grades it a **nitpick**
rather than a blocker on that basis, and asks that it be **recorded**. this row is that record.

## ⚠️ .what the answer does NOT claim

that the deviation is costless. the exit-1 malfunction-class assertion rests entirely on the
direct spawn, exactly as the reviewer says. were the skill's cwd dependence ever removed, this
case should move back through the contract — which is why the `rework` grade is **clean**: one
call site, no caller hardened against it.

## .the verdict, once ruled

— awaited —

## .see also

- `rule.require.acceptance.blackbox` — the rule, and the exception clause this answer rides
- `rule.forbid.failhide` — why the sanctioned alternative is the worse option here
- `F36` — the three documented exits, and the fault seam that would have reached this one
- `F46` — the peer row from the same lane, on the unit-suite mock
