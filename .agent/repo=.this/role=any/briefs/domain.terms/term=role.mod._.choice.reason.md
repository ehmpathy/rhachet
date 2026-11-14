# domain.term.choice.reason: mod

## .etymology

**mod**, from the game mod: a layer a player puts over a game they did not make, while the game
itself still moves under it with each release. that is the exact relation here — a repo layers a
change over a role a package ships, and the package still releases under it. the `@version` in
`of:` and the onStop pester are the game mod's "made for 1.39.5" line, made checkable.

the reserved repo slug follows: `.agent/repo=.mods/`, a peer of `.agent/repo=.this/`. both are
repo literals no package can ship, so every scanner of `.agent/repo=*` asks one predicate
(`asRepoSlugKind`).

## .disputes

### dispute: edit — raised 2026-10-16 — status: RESOLVED (keep `mod`)
- raised.by  = the wish, which named the dir `.agent/repo=.edit/`
- claim      = "edit" says what the human does
- counter    = "edit" reads as a change to the original, and a mod never changes the original — the
               package files stay as published, and the view links around them. a reader of
               `repo=.edit` would look for the role's own files there
- resolution = keep `mod`; `edit` is a forbidden synonym in contracts

### dispute: overlay — raised 2026-10-16 — status: RESOLVED (keep `mod`)
- raised.by  = the route's own slug (`feat-role-edit-overlay`) and the overlayfs analogy
- claim      = overlayfs is the precise mechanism: an upper layer, same path wins, a whiteout deletes
- counter    = overlayfs adds any new file silently; a mod refuses an unsaid add, so a typo of a held
               path cannot become a quiet addition. the analogy explains the shadow and misleads on
               the add. and "overlay" names the mechanism, never the artifact a human authors
- resolution = keep `mod`; `overlay` stays an analogy in prose, never a contract word

### dispute: override, patch — raised 2026-10-16 — status: RESOLVED (keep `mod`)
- claim      = both are common words for "change what ships"
- counter    = "override" says one value wins, but a mod also adds and removes; and "patch" implies
               a diff applied to a file (patch-package), where a mod ships whole files
- resolution = keep `mod`; both forbidden in contracts

## .evidence

- the vision's terms table, `.behavior/v2026_10_16.feat-role-edit-overlay/1.vision.yield.md`
- the shape: a mod dir is real files plus one `boot.yml`, so a pr diff shows every mod, and a shadow
  is read against upstream with a plain `diff` of two paths
