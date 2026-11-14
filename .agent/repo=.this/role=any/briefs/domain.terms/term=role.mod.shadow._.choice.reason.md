# domain.term.choice.reason: shadow

## .etymology

**shadow**, as a scope shadows a name: an inner declaration of the same name hides the outer one,
which still exists and still applies wherever the inner one does not reach. a mod file at a held
path hides the published file the same way — the package file is untouched on disk, and every
path the mod does not name still reads through to it.

it is also the word this repo already used one grain up: a `.this` role of a package role's slug
used to hide that role whole, by name collision. that whole-role shadow is gone (roles of one slug
now boot apart, requirements case 10), so the word moves down a grain, to the file, with its sense
intact.

## .disputes

### dispute: overwrite, replace — raised 2026-10-16 — status: RESOLVED (keep `shadow`)
- raised.by  = the wish, which said a mod file "OVERWRITES" the brief of the same path
- claim      = "overwrite" is what the human sees: the boot shows the mod file, not the published one
- counter    = both say the original is gone. it is not — it is hidden, still on disk, and back the
               moment the mod is deleted and the view re-rendered. a reader of "overwrite" would
               expect the package files changed, and would hunt for a backup
- resolution = keep `shadow`; `overwrite` and `replace` are forbidden synonyms in contracts

## .evidence

- the vision's terms table, `.behavior/v2026_10_16.feat-role-edit-overlay/1.vision.yield.md`
- `setRoleUnmoddedView` restores the published layout from the record alone, which only holds
  because a shadow never touched the package files
