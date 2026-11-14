# howto.mod-a-role

> **change a role this repo consumes, with no release of the role's package.** put the change in
> `.agent/repo=.mods/role=<role>/`; the next render shows every clone the modded role.

```
.agent/repo=.mods/role=mechanic/
  boot.yml                          # of: ehmpathy/mechanic@1.39.5
  briefs/rule.require.surf-wax.md   # SHADOW — a path the role holds
  briefs/rule.require.reef.md       # ADD — a path the role lacks, that boot.yml says
```

## .the three moves

| move | how | what a clone sees |
|---|---|---|
| **shadow** | a mod file at a path the role holds | the mod file, in place of the published one |
| **add** | a mod file at a path the role lacks, named by a `say` or `ref` glob | the mod file, beside the published ones |
| **not** | a `not` glob in the mod `boot.yml` | the published file is gone |

a path is the key, relative to the role dir (`briefs/…`, `skills/…`). a typo of a held path is
refused, never read as an add: an add must be said, so a stray file has no quiet home.

## .the mod boot.yml

the role's own schema, plus `of:`, less `budget:` and `inherit:`.

```yaml
of: ehmpathy/mechanic@1.39.5     # repo/role, and the version the mod was made against
always:                          # the mechanic is a subject role, so its mod is too
  briefs:
    say:
      - briefs/rule.require.reef.md
    not:
      - briefs/rule.forbid.wipeouts.md
```

a simple role (its `boot.yml` opens with `briefs:`) takes the same keys at the top level:

```yaml
of: ehmpathy/surfer@1.0.0
briefs:
  say:
    - briefs/rule.require.reef.md
```

- **`of:`** names the role. a bare `of: mechanic` works while one package ships that slug; two →
  refused, pin one. a `.this` role is refused: edit it in place
- **one mod per slug.** the mod dir is keyed by the role slug alone, so where two packages ship
  one slug, only the role `of:` names carries a mod
- **`@version`** opts into the pester: once an upgrade moves the role off that version, `rhx upgrade`
  lists every mod to re-read and names the fix (`set of: <role>@<installed>`), and each boot's mod
  notice names the drift (`@1.39.5 (installed 1.40.0)`). no stop hook carries it. no `@version`, no
  pester
- **the mode matches the role's.** a simple role takes top-level `briefs:`/`skills:`; a subject
  role takes `always:`/`subject.<slug>:`, and only the subjects it declares
- **the mod reads first.** what the mod says or refs is settled by the mod; the role curates the
  rest as published

## .the render

a mod changes the role dir itself: `briefs/` and `skills/` become real dirs of per-file links.
every reader of the role dir then sees the modded role with no mod logic of its own, and a shadow
skill still sits beside its published peers.

| you… | then… |
|---|---|
| add, edit, or delete a mod | run `rhx init --hooks` (or any `rhx init --roles …`) — it re-renders the view. a boot never heals one |
| boot with a stale view | the boot fails loud, exit 2, and names `rhx init --hooks` |
| delete the mod dir and render | the role returns to its published layout |
| render a view that changed | the render names the role, and says a live clone keeps the boot it read at start; re-enroll it |
| run `rhx roles cost --all` | the modded role row carries `[~] modded · N shadow · N add · N not`; a modded role with no row (no boot.yml, a stale view, a refused mod) is named in a `.agent/repo=.mods` block below |

## .what a clone sees

a modded role's boot opens with a notice, and each modded resource carries a tag:

```
<mod of="ehmpathy/mechanic@1.39.5">
role ehmpathy/mechanic@1.39.5 is modded in this repo — 1 shadow, 1 add, 1 not
[-] not briefs/rule.forbid.wipeouts.md
</mod>
<brief.say path="…/rule.require.surf-wax.md" mod="shadow">
```

each not is a `[-] not` line. a shadow that drops a published `.md.min` adds a
`[~] shadow <path> drops the published <path>.min` line, so the lost minified form is named.

## .what is refused

| the mod | why |
|---|---|
| a file outside `briefs/` and `skills/` | a readme, an init, a hook, or a keyrack is not in scope |
| a `not` that matches no held file | it removes naught; the nearest held path is named |
| a `not` of a skill one of the role's hooks invokes | the hook would fail at its next event; shadow the skill |
| a mode other than the role's | one mode per merge |

a refusal fails the actors that carry the role, and only them; every other actor still renders.

## .why

a change to a role used to cost a release before one clone could try it. a mod moves that
roundtrip from before the experiment to after it: try the change here, watch the clones under it,
then promote upstream what earned it.

## .see also

- `define.agent-dir` — the `.agent/` layout `repo=.mods` joins as a reserved slug, beside `.this`
- `catalog.of=usage._.md` — the index this brief is one row of
