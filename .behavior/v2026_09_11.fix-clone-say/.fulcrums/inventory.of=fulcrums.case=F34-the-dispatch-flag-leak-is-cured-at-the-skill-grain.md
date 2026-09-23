# F34 — the dispatch-flag leak is cured at the skill grain, not at its root

- **rework**: dirty
- **status**: open
- **confidence**: 82%

## .the fork, stated fairly

`rhx <skill> <args>` hands the skill its own dispatcher's flags — `--skill`, and `--repo` / `--role`
where a caller disambiguates. the leak has two possible cure grains:

| option | the cure | reach |
|---|---|---|
| **A — the skill grain** (taken) | each skill declares `--repo\|--role\|--skill` as recognized | one repo's 4 skills, plus a clamp that holds the bar for the next one |
| **B — the dispatcher grain** (the root) | `invokeRun.ts` strips its own options before it builds `rawArgs` | every skill in every linked role, and no per-skill arm is owed at all |

⇒ B is the honest root by `rule.require.solve-at-cause`. A is a per-skill declaration, and it is
precisely what this repo's own correct exemplar (`show.claude.task.output.sh`) already does.

## .taken, and why at the time

**A, with B caught as a dream.** three reasons, in order of weight:

1. **B's blast radius is not this worktree's to measure.** it changes the argv contract for ~40
   skills across six linked roles, most of which live in `node_modules`. a wrong strip is silent —
   which is the very hazard the invariant this round declares exists to forbid
2. **B carries a named collision that must be settled first.** `perf.test.sh` declares `--skill` as
   a flag *of its own* (it sets `SKILL_NAME`). so B needs a position-aware strip — strip the pair the
   dispatcher inserted, by index rather than by name — which is a design call, not a one-liner
3. **A is complete at the grain a caller touches.** every skill in this repo now works through `rhx`,
   and the clamp refuses the next one that would not

## .rework, and why it is dirty

🔴 **dirty.** B does not replace A's edits so much as make them dead: once the dispatcher strips, each
`--repo|--role|--skill) shift 2` arm never fires and comes out. that is a sweep across every skill in
every role that took the workaround, plus the clamp's second assertion, which B retires outright.

⇒ so this is not a rename or a swapped default. the reversal is a teardown of the workaround layer,
and it is exactly the shape `rule.always.defer-fulcrums-to-last` grades dirty.

## .confidence, and why it is not higher

**82%.** the arithmetic is measured and I hold it firmly — the leak is real, its mechanism is read
from source, and four skills are walked. what I am less sure of:

- 🟡 **whether B is even wanted.** it is arguable that `rhx` sugar SHOULD hand a skill the full run
  argv, and that a skill that declares the dispatcher's flags is the intended contract rather than a
  workaround. the extant exemplar's comment (*"rhachet passthrough args - ignore"*) reads as a
  concession, not a design — but the author is not here to say which
- the `perf.test.sh --skill` collision may have a third resolution I have not found

## .where

- `src/contract/cli/invokeRun.ts:21-26` — `getRawArgsAfterRun`, the leak
- `.agent/repo=.this/role=any/skills/aws.whoami.sh` · `perf.test.sh` · `show.bun.deps.sh` — the
  cured argv boundaries
- `.agent/repo=.this/role=any/skills/unknown-flag-refusal.integration.test.ts` — the clamp
- `.agent/repo=.this/role=any/briefs/define.invariant.an-unknown-flag-is-refused-never-dropped.md`
- `.dream/2026_09_20.rhx-dispatch-flags-leak-into-every-skills-argv.dream.md`

## .the verdict

unruled.
