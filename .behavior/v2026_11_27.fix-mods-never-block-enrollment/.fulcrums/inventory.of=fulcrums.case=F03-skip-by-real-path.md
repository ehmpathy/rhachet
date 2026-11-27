# F03 — a skipped mod is skipped by real path

- **fork**: a skipped role boots (a) its dir as the sync left it, on trust that the sync returned it to published · (b) its dir less every file whose real path sits under `.agent/repo=.mods/`
- **taken**: (b), on top of (a). the sync already reverts a refused view, but not in three cases: the revert itself is refused (a stray file, C10); the record is corrupt, so the orphan arm returns its refusal with no revert (C11, `syncRoleModdedViews.ts:378-385`); the view lags, met on a hand boot with no sync before it (C12). in each, the modded links stay on disk. the real-path filter makes "skipped whole" hold by construction in every case
- **premise, verified**: each shadow and add links to `join(modDir, path)` (`asRoleModdedViewLinks.ts:26-28`), so every mod file in a view resolves into the mods dir
- **bound**: the filter compares against the **real** path of `.agent/repo=.mods`, never the literal one — a repo that symlinks its mods dir to a shared tree would else leak every mod file past the filter
- **rework**: clean — one filter in the boot walk
- **confidence**: 85%. the filter alone left each `not`ed and each shadowed published file absent where a modded view stood; F06 reads those from the view record's sources, so the boot is the whole published role
- **where**: `getAllRoleFilesAsPublished.ts`, read by `getOneRoleBootContent.ts` and `genBootPayload.ts`
