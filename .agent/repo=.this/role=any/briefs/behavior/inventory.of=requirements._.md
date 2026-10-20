# inventory.of=requirements

> **every behavioral requirement rhachet has promised, each one clamped and each one proven. an entry
> here is never dropped — see `rule.forbid.dropped-behavioral-requirements`.**

## .what

one file per requirement (`inventory.of=requirements.case=<n>.<slug>.md`). each entry names:

- **the requirement** — the observable behavior, in the words a user would check it by
- **the clamp** — the code that enforces it, by path
- **the proof** — the test that fails if the behavior regresses, by path
- **the source** — who asked for it, and when

## .why

a requirement that lives only in one behavior's wish is lost the next time a design question gets
"answered from code". measured 2026-10-02: `rhx init --roles -xyz` was meant to drop `xyz` from the
`prepare:rhachet` entry, and the `v2026_07_07.fix-rhx-init` vision closed that question as "flags act
on the passed specifiers". the removal unlinked `xyz` while the next `npm install` linked it back.
no test failed, because none asserted the requirement.

an inventory outlives any one behavior: a new design reads it before it reshapes a surface, and a
reviewer checks a change against it.

## .the inventory

| # | requirement | status |
|---|---|---|
| 1 | 🔴 [`rhx init --roles -xyz` drops `xyz` from `prepare:rhachet`](./inventory.of=requirements.case=1.init-removal-drops-from-prepare.md) | proven |
| 2 | [an init role delta reaches every actor delta'd from the ambient set](./inventory.of=requirements.case=2.init-delta-reaches-delta-actors.md) | proven |
| 3 | [`rhx enroll claude --roles -driver` drops driver](./inventory.of=requirements.case=3.enroll-roles-subtract.md) | proven |
| 4 | [`rhx enroll claude -driver` is an alias of `--roles -driver`](./inventory.of=requirements.case=4.enroll-bare-delta-alias.md) | proven |
| 5 | [the default peer reviewer brain is `openrouter/deepseek/flash`](./inventory.of=requirements.case=5.default-peer-reviewer-brain.md) | proven |
| 6 | [rhachet's locks use `with-simple-mutex`](./inventory.of=requirements.case=6.locks-use-with-simple-mutex.md) | proven |
| 7 | [a brain dir holds one answer, rhachet's — no kept-aside copies](./inventory.of=requirements.case=7.no-kept-aside-one-answer.md) | proven |
| 8 | [role inits meet the split layout: `settings.of.repo.json` always present, the layout before the inits](./inventory.of=requirements.case=8.role-inits-meet-the-split-layout.md) | proven |
| 9 | 🔴 [a clone loads no hook from a role it is not enrolled in, from any settings layer](./inventory.of=requirements.case=9.clone-loads-only-its-roles-hooks.md) | proven |
| 10 | [a plain `claude` at the repo root loads the repo actor's settings](./inventory.of=requirements.case=10.plain-claude-loads-repo-settings.md) | proven 2026-10-16 · real-claude rerun owed |
| 11 | [the home `CLAUDE.md` never loads in a repo session, plain or enrolled](./inventory.of=requirements.case=11.home-claude-md-never-loads-in-a-repo.md) | proven 2026-10-16 · real-claude rerun owed |

## .how to add an entry

- a wish, a vision, or a human states a behavior → it gets an entry the same day, status `owed`
- an entry turns `proven` only when its proof test exists and passes, cited by path
- to change what an entry requires, the wisher amends the entry; a design, a review, or a refactor
  never does it alone

## .see also

- `rule.forbid.dropped-behavioral-requirements` — the rule this inventory serves
- `../../../role=user/briefs/actors/inventory.of=experience._.md` — the convention this follows
