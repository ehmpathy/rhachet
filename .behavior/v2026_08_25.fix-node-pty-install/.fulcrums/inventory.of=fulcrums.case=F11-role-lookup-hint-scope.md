# F11 — revert the role-lookup hint rows, on a scope justification that measurement refuted

**taken** = i065, 2026-09-05
**rework** = clean
**confidence** = 94%
**status** = ⚠️ **reversed** at i065 — the round's own change was reverted

## .the fork, stated fairly

`getRoleFromManifests` rejects four ways, and this round had added a rendered `hint` row to the
three that carried only a metadata key. the fork:

| option | the case for it |
|---|---|
| **keep the hint rows** | `rule.require.discoverability` grades an error that rejects input without a note of the valid options a **blocker**. a reader should read the options off a row, never hunt them inside a json blob |
| **revert them** | `rule.forbid.scope-leaks` — the wish bounds this round to node-pty's declare/install/load path and the report it prints. role lookup governs `rhx init` / `link` / `ask`, and is none of those |

⚠️ **both rules are real and they pull opposite ways**, which is exactly the shape that makes a
scope call a fulcrum rather than an obvious deletion.

## .what was taken, and why AT THE TIME

**revert.** `r010 enroll-impl-behavior-intent` graded it a scope leak, and the check that settled it
was not the rule text but an artifact:

🚨 **the execution yield had justified the change as a REGRESSION REPAIR** — it claimed
`rhx init +nonesuch` *"lost its `availableRoles` list"* under this round's new frame. that claim, if
true, would have put the fix squarely in scope. **`main`'s own snapshot refutes it:**

```
 exports[`... rhx init +nonesuch ... 1`] = `
 "
-BadRequestError: role "nonesuch" not found
 {
   "specifier": "nonesuch",
-  "availableRoles": [ "$AVAILABLE_ROLES" ]
 }
```

the list was on screen before the round and on screen after it, because `asCliErrorFrame` renders
metadata **unredacted** by the wisher's own directive. ⇒ **naught was lost, so naught was repaired**
— which makes the change a pure enhancement to an adjacent surface, the definition of the leak r010
named.

⇒ the general lesson, and it is worth more than the patch: **a scope justification is a claim, and a
claim is checkable.** mine survived four review rounds because nobody, myself least of all, put it to
the one artifact that settles it in a single read.

## .why the rework is CLEAN

- the revert is `git show origin/main:<path>` over four files — the operation, its two acceptance
  assertions, and their snapshot masker
- **no caller hardened against it.** the added `hint` row was read by exactly the two acceptance
  assertions reverted alongside it; no production path consumes it
- the post-revert snapshot diff against `main` is exactly the `✋` glyph line this round owns, plus a
  brief-count row that predates this round — i.e. the surface is back to `main` on every axis this
  round does not own

⚠️ **and the confidence is 94% rather than higher for one reason:** two i051 review findings
(`r001`'s `BadRequestError` → `ConstraintError` class change, `r009`'s empty-list `whenEmpty` arm)
were raised **against the touched file**. the revert moots them rather than opposes them — they were
conditional on the file being in the diff — so no reviewer is contradicted. the residual 6% is that
a later reader could read the revert as a refusal of those two points rather than as a de-scoping.
**the dream states outright that both still fire on `main` today**, which is what closes that gap.

## .where it landed

- `src/domain.operations/manifest/getRoleFromManifests.ts` — reverted to `main`
- `blackbox/cli/rhx.acceptance.test.ts` · `blackbox/cli/init.incremental.acceptance.test.ts` —
  assertions and masker reverted to `main` at three sites
- `.dream/2026_09_05.role-lookup-errors-name-what-is-available.md` — the removed patch **verbatim**,
  because it was uncommitted and that file is its only copy

## 🚨 .the second defect the revert also removed, which the dream carries

the replacement snapshot masker this round had written was:

```ts
.replace(/(available roles: ).*/, '$1$AVAILABLE_ROLES')
```

`.*` runs to end of line, so it ate the quote that terminates the value and left a snapshot whose
json is visibly unterminated — **and it masked only the rendered row, never the metadata array**, so
the same snapshot enumerated all sixteen real roles inline and would redden on any role added
anywhere. `main`'s masker has neither defect.

⇒ so the revert was not merely scope-correct; it also restored a masker that works. that is recorded
here rather than left implicit, because it is the part a re-land must not lose.

## .the verdict

**ruled at i065, by the driver, on r010's blocker #3.** no wisher escalation was sought: the wish
delegates the how, `rule.forbid.scope-leaks` is unambiguous once the regression claim is disproven,
and the rework is clean — so `rule.always.defer-fulcrums-to-last` says drive on rather than halt.
