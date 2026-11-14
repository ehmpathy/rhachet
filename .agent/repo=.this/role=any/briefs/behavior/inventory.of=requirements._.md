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
| 10 | [two repos that ship one role slug both boot — neither is dropped](./inventory.of=requirements.case=10.same-slug-roles-boot-apart.md) | proven |
| 11 | [a mod shadows, adds, and nots the files of a role it consumes](./inventory.of=requirements.case=11.mod-shadows-adds-and-nots.md) | proven |
| 12 | [a typo in a mod is refused, never read as an add or a quiet no-op](./inventory.of=requirements.case=12.mod-typo-is-refused-never-an-add.md) | proven |
| 13 | [a clone of a modded role sees a notice, and a tag on each modded resource](./inventory.of=requirements.case=13.modded-role-boots-with-notice-and-tags.md) | proven |
| 14 | [a pinned mod pesters at the upgrade and the boot once its role moves off the pin](./inventory.of=requirements.case=14.mod-version-pester-at-upgrade-and-boot.md) | proven 2026-11-09, as amended (F23 (b)) |
| 15 | [a stale modded view fails the boot loud and names `rhx init --hooks`](./inventory.of=requirements.case=15.stale-modded-view-fails-the-boot.md) | proven 2026-11-09, as amended (F23 (b)) |
| 16 | [a `not` of a skill a role hook invokes is refused at render](./inventory.of=requirements.case=16.mod-not-of-a-hook-skill-is-refused.md) | proven |
| 17 | [a mod out of scope is refused — its files, its mode, and its `of:`](./inventory.of=requirements.case=17.mod-out-of-scope-is-refused.md) | proven |
| 18 | [a refused mod fails only the actors that carry its role](./inventory.of=requirements.case=18.refused-mod-fails-only-its-actors.md) | proven |
| 19 | [a `.md.min` rides with its `.md` in a mod](./inventory.of=requirements.case=19.mod-min-rides-with-its-md.md) | proven |
| 20 | [`.agent/repo=.mods` is a reserved slug — no supplier, no role, no scan](./inventory.of=requirements.case=20.mods-dir-is-no-supplier.md) | proven |
| 21 | [a deleted mod returns the role to its published layout](./inventory.of=requirements.case=21.deleted-mod-returns-the-published-role.md) | proven |
| 22 | [`roles cost` marks a modded role, and a mod alone arms no stop hook](./inventory.of=requirements.case=22.modded-role-marked-no-stop-hook.md) | proven 2026-11-09, as amended (F23 (b)) |
| 23 | [a shadow skill runs beside its published peers](./inventory.of=requirements.case=23.shadow-skill-finds-its-published-peer.md) | proven |

## .how to add an entry

- a wish, a vision, or a human states a behavior → it gets an entry the same day, status `owed`
- an entry turns `proven` only when its proof test exists and passes, cited by path
- to change what an entry requires, the wisher amends the entry; a design, a review, or a refactor
  never does it alone

## .see also

- `rule.forbid.dropped-behavioral-requirements` — the rule this inventory serves
- `../../../role=user/briefs/actors/inventory.of=experience._.md` — the convention this follows
