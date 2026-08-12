# rule.always.rerun-dark-review-lanes-scoped

## .what

when a bhrain peer-review lane returns `constraint` / `malfunction` because its prompt exceeds the
context window, that is **not** a wall — it is a scope problem in the guard's own configuration.
re-run the same rubric by hand, scoped, before you report the overflow upward.

the guard runs its reviewers with `--diffs since-main`. the `rhx review` skill is not so bound, so
the identical rubric runs fine under a narrowed invocation:

```sh
rhx review --rules '<the lane's rubric path>' \
           --paths-with 'src/<subsystem>/**/*.ts' \
           --paths-wout '**/*.test.ts' \
           --output '.review/<iter>.<lane>.scoped.<slug>.md' \
           --goal exhaustive
```

## .why

a dark lane reads exactly like a reviewed one on the ladder — both are terminal, both unlock the
next level — so an overflow that is merely *reported* silently removes a lens from the drive. the
longer it stays dark, the larger the unreviewed surface, and the record shows only that someone
noticed.

on the keyrack `--reach` drive, lanes r008/r009 were dark for ~30 rounds and each round filed the
overflow as an accepted constraint. one scoped run produced real verdicts in ~2 minutes — **0
blockers / 0 nitpicks** on one rubric, **3 items** on the other — which converted a 30-round
process complaint into evidence, and evidence is what a merge decision actually needs.

## .the rule

| the lane returned | you must |
|-------------------|----------|
| context overflow | re-run the rubric scoped, then report the verdict — never the overflow alone |
| absent supply / bad glob | driver-fixable; correct the path and re-arrive (`rule.always.diagnose-reviewer-malfunctions`) |
| a real verdict | answer it through the contemplation loop as usual |

treat *"the lane is dark"* as a task, never as a verdict.

## ⚠️ .then check attribution per file

on a branch that carries **zero commits** and trails `origin/main`, a `--diffs since-main` scope
renders **main's newer code as this branch's deletions**. so an item raised by any since-main lane
may belong to main rather than to the work under review.

confirm each before you accept or fix it:

```sh
git diff origin/main --stat -- <the flagged file>   # empty  => the file is untouched here
git diff origin/main -- <the flagged file>          # inspect => is the flagged line in a hunk?
```

an item whose line sits outside every hunk is **not yours**. record it as a follow-on that
predates the branch (`rule.forbid.scope-leaks`) rather than fix it inside a bounded wish.

## .enforcement

- a review lane reported as a constraint without a scoped re-run attempt = **blocker**
- an item from a since-main lane accepted or fixed without a per-file diff check = **blocker**

## .see also

- `rule.always.diagnose-reviewer-malfunctions` (bhrain/driver) — the diagnose-before-escalate twin
- `rule.always.converge-to-terminal` (bhrain/driver) — why a dark lane must not be coasted past
- `rule.forbid.scope-leaks` (bhuild/behaver) — why a pre-branch item stays a follow-on
