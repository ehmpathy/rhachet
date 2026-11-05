# feat(mods): mod an extant role in place, via `.agent/repo=.mods/role=<role>/`

> **draft, for review.** this pr holds the vision, criteria, research and blueprint of the route
> `.behavior/v2026_10_16.feat-role-edit-overlay`. no `src/` change yet. the blueprint awaits the
> commander's review; execution starts only on his approval.

## .what

a repo can modify a role it consumes, without a publish of that role's package:

```
.agent/repo=.mods/role=mechanic/
  boot.yml                       # the role's schema, plus `of: ehmpathy/mechanic@1.39.5`, less `budget`
  briefs/rule.require.foo.md     # shadow: same path as a published brief, renders in its place
  briefs/rule.require.bar.md     # add: a new brief, said by a say/ref glob in the mod's boot.yml
```

plus `not:` globs to drop published files, a `[~] modded` mark in `rhx roles cost`, a boot notice,
and an onStop pester when `of:`'s version drifts from the installed role.

## .the route, so far

| stone | status | yield |
|---|---|---|
| 1.vision | approved (director) | `1.vision.yield.md` |
| 2.1.criteria.blackbox | passed | `2.1.criteria.blackbox.yield.md` — usecases 1–12 |
| 3.1.research.internal.this-overrides | passed | F11 a1 changes 1 repo today: rhachet's `.this` architect hides `ehmpathy/architect` (36 briefs) |
| 3.3.1.blueprint.product | **blocked, for the commander** | `3.3.1.blueprint.product.yield.md` |
| 6.adopt.mods.in.nheuron | queued | moves nheuron's `.this` learner into `repo=.mods`, a pr on uladkasach/nheuron |

## .open questions for the commander

each has options and a lean. no lean is applied in the blueprint trees; each tree that depends on
one names it (`→ Qn`).

| # | question | options | lean |
|---|---|---|---|
| Q1 | a role and its mod in different boot.yml modes (simple vs subject) | (a) the mod must use the role's mode; a role with no boot.yml takes a simple mod · (b) either mode, simple read as `always:` · (c) the mod is always subject mode | **(a)** — one mode per merge keeps first-say-wins as is; a simple spec's "say all" has no faithful `always:` form |
| Q2 | where the modded view is written | (a) one `syncRoleModdedViews`, called by enroll, init, upgrade, roles link; `execRoleLink` untouched · (b) inside `execRoleLink`, plus a call from enroll | **(a)** — enroll never links, so (b) needs the second call anyway; an unmodded role's path stays byte-identical |
| Q3 | a stale view at boot | (a) fail loud, name `rhx init`; every render re-materializes · (b) boot heals it in place, then boots | **(a)** — boot stays read-only and fast; the onStop sweep names the render owed |
| Q4 | release order of a1 vs the nheuron move | (a) one release; the nheuron pr merges right after · (b) nheuron first — loses the brief, the mod dir needs this release · (c) mod dir first, a1 later | **(a)** — the two-learner window is one merge long, in one repo |
| Q5 | which hook command forms the `not` refusal reads | (a) `rhx <skill>` and `bash .agent/…sh` only · (b) all five forms on disk · (c) (a) plus a scan of skill bodies | **(a)** — the only forms that name a skill file; (c) is a guess at bash |
| Q6 | `asRoleRefsFirstSeenPerRole`, once F11 removes its callers' dedupe | (a) delete it and its test · (b) keep it unused | **(a)** — dead code |
| Q7 | may a mod target a `.this` role | (a) refused — edit it in place · (b) allowed | **(a)** — a mod of your own role is a second copy of one truth |

## .release notes this change will owe

- a `.this` role now boots beside a same-slug package role. rhachet's own clones gain
  `ehmpathy/architect` (36 briefs), which the `.this` architect hid. this ships only on the
  commander's release review (F11)
- `repo=.mods` is a reserved repo slug

🤖 Generated with [Claude Code](https://claude.com/claude-code)
