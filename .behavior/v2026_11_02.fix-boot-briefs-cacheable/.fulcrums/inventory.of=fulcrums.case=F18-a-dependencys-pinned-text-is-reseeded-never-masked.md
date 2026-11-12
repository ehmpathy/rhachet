# F18 — a dependency's text pinned in a snapshot here is reseeded to its owner, never masked

## .the fork

the bump to `rhachet-roles-ehmpathy` 1.40.0 adds one line to the stdout of `rhx init --roles mechanic`:

```
note: this clone's config dir is …; its settings.of.repo.json is derived from this file. …
```

it carries a `:` separator (`rule.forbid.colons-in-stdout`), the clone-config misnomer
(`rule.forbid.clone-config-misnomer`), and one long run-on row. the line is emitted by
`node_modules/rhachet-roles-ehmpathy/dist/domain.roles/mechanic/inits/init.claude.permissions.sh:129`;
no file in this repo writes it. `init.incremental.acceptance.test.ts` snaps the whole init stdout, so the
line lands in this repo's snapshot.

- **A** — keep the snapshot honest, and reseed the fix to `rhachet-roles-ehmpathy`
- **B** — mask the line out of the snapshot
- **C** — pin the dependency below 1.40.0

## .taken

A. B is a workaround: it hides the text a human reads from the snapshot whose job is to show it, and the
next bump would slip past unseen. C drops the permission write that inventory case 8 relies on. the
reseed dream holds the one-word fix and the separator repair; the snapshot updates when the owner ships.

## .rework

clean: the next bump of the dependency moves one snapshot line.

## .confidence — 85%

the source of the line is read from the dependency's dist; the one judgment is that a pinned dependency
emission is the owner's to fix.

## .where

- `blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap` [case1]
- dream `.dream/v2026_11_04.reseed.mechanic-init-note-names-a-clone-config-dir.md`

## .verdict

open, for the fulcrum council
