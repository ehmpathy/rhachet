# F06 — a skipped role boots its published files, read from the view record or its links

- **fork**: a skipped role whose view the last render left modded boots (a) the view less every mod file, which lacks each `not`ed and each shadowed published file · (b) the published files of the view record's sources, each at the path a published link gives it · (c) a heal of the view at boot
- **taken**: (b). (a) claims "boots as published" and is not; (c) makes a boot write, and a boot never heals a view
- **the cause it also cures**: the boot plan matched say globs by a scan of the disk (`filterByGlob` ran fast-glob in the role dir), so a published file absent from the view matched no glob and fell to a ref. the filter now matches the boot's own file list in memory. that reaches every boot, so it was verified against nine boot suites (469 tests, 123 snapshots, no change) and clamped by `filterBootResourcesByGlob.test.ts` [case1]
- **no record**: a modded kind dir whose record cannot be read (C11) reads its sources from its own file links: each kept published file links into its source dir at the path a published link gives it, so the link target less that path is the source, and a walk of the source returns the `not`ed files too. a kind dir `roles link` made, or a native one, walks as published as it stands. `roles.mods.acceptance` case18.5 and `enroll.mods.integration` case8.c11 pin it (the `not`ed `rule.forbid.wipeouts.md` boots)
- **bound**: a modded kind dir that keeps no published file link (a mod that shadows or nots every file) reveals no source, so with no record it boots only what it holds; the skip still names the fault and its fix
- **rework**: clean — one transformer and one read hook (`asPathToRead`) on the say reader
- **confidence**: 85%. the in-memory match keeps `dot: false` and drops a `./` prefix; a glob form fast-glob read and picomatch does not would surface as a ref where a say was meant
- **where**: `getAllRoleFilesAsPublished.ts`, `filterBootResourcesByGlob.ts`, `getAllBootSayResources.ts`
- **proof**: `roles.mods.acceptance` case6 [t1] (the `not`ed brief boots), case5 [t2], case2 [t0]
