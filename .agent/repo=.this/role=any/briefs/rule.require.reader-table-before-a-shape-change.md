# rule.require.reader-table-before-a-shape-change

> **before you change the shape of an artifact that many readers consume, list every reader and what
> each one gets, before and after. a row that changes is a decision — record it, or refuse the change.**

a **shape change** = a change to what a shared artifact holds, where it lives, or what it points at: a
config file, a dir layout, a symlink, a schema, an env var, a cli's output, an api response.

a **reader** = every path by which a process or a human consumes it — the one your product paves, and
every one it does not: the raw binary, an ide plugin, ci, a cron, a downstream repo, a bare shell.

## .why

- a design is drawn from the reader the author has in mind. every other reader inherits the change
  without a vote, and its loss shows as no diff at all
- the table is cheap before the merge and expensive after: one row per reader, two columns. after, it
  is a bug report from a reader you never named
- a changed row is not wrong — it is a choice. the defect is a choice nobody made

## .the test

> **"for each reader, what did it get before, and what does it get after?"**

| reader | before | after | decision |
|---|---|---|---|
| … | … | … | same · kept on purpose · dropped on purpose · **unknown → stop** |

every row filled → proceed · a row reads `unknown` → measure it before the merge · a reader you
cannot list → you do not yet know who consumes the artifact. find out first.

## .the cues

| when… | then… |
|---|---|
| you move, rename, split, or re-point a file other processes read | 🔴 the strongest cue. draw the table |
| your design names "the reader" in the singular | name the others. there are always others |
| a reader exists only because a human set up an alias, a hook, or a plugin | it is still a reader — and the reader without that setup is a second row |
| a row's `after` is "none" | 🔴 a reader lost the artifact. say who decided that |
| the change ships a migration | the migration is a reader of the old shape too |

## .the worked case — rhachet pr #600, v1.49.2

the split layout re-pointed `<repo>/.claude/settings.json` from a real file of the repo's hooks to an
arrow toward the machine's own settings. the design brief named one reader:

> every reader is an enrolled clone (`claude` is aliased to `rhx enroll claude`)

the table it skipped:

| reader | before | after |
|---|---|---|
| an enrolled clone | the repo's hooks | the repo's hooks, via `--settings` |
| a plain `claude` at the repo root | the repo's hooks, via the project layer | **none** |

the second row shipped unseen. a downstream repo found it: a plain session had none of the repo's
allows or hooks, and no output said so. the cure (a `settings.local.json` arrow) came a release later.

## .the second case — the same table, drawn, and it held

`v2026_10_15.fix-split-layout-local-settings-arrow` added `claudeMdExcludes` to the repo's settings.
the table showed a plain `claude` would stop to load a human's `CLAUDE.local.md`. that row went to the
wisher, who ruled it a deliberate drop, and the requirement recorded it. same kind of change, same
kind of row — decided this time, instead of found.

## .the boundary

| fires | does not fire |
|---|---|
| an artifact with more than one consumer | a private file one function reads and writes |
| a consumer outside your own code (a vendor tool, a human, another repo) | an internal refactor whose every reader is in the diff and type-checked |

## .enforcement

- a shape change to a shared artifact, merged with no reader table = **blocker**
- a reader table with a row whose `after` is unmeasured = **blocker**
- a row that changes with no recorded decision = **blocker**

## .see also

- `rule.require.inventory-incidental-behaviors-before-a-redesign` — the table's `before` column, for
  the behaviors no one asked for
- `rule.forbid.local-facts-as-design-premises` — why "the reader" was singular
- `rule.require.test-the-entry-humans-use` — a reader in the table owes a test
