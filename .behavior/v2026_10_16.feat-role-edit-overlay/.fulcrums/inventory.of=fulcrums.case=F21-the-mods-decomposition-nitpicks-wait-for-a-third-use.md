# F21 — the mods decomposition nitpicks wait for a third use

## .the fork

the r011 peer lane names refactors of the mods subdomain:

- one `getAllRepoDirsOfKind` for the scanners that filter `repo=*` dirs
- `asRepoSlugKind` moved out of `mods/`
- the onStop and upgrade orchestration moved out of the contract layer
- one `getOneRoleModState` derivation shared by assert-fresh, drift and the pester
- one mod-attr transformer for both renderers
- one `asRoleResourceKind` for the `briefs/` | `skills/` prefix
- `asRoleDir` plus `genContextCli` in place of the hand joins
- a `RoleLinkRef` passed to `getOneRoleModForRoleDir` in place of its regex
- one matcher in `computeRoleModPlan`
- `computeRoleModHookConflicts` renamed `assert…`
- one implementation of `not`
- the supplier resolution reused for the package version
- a hook regex scoped to the role that declares the hook

the choice: **a — ship the subdomain as it stands, and refactor at the next change that touches
it** (taken), or **b — refactor before #702**.

every item lands in #702, since `rule.forbid.deferrals-short-of-a-dedicated-pr` forbids a deferral:

| item | state |
|---|---|
| `asRepoSlugKind` out of `mods/` | landed — `role/asRepoSlugKind.ts` |
| `computeRoleModHookConflicts` renamed `assert…` | landed — `assertRoleModNotsSpareHookSkills` |
| a `RoleLinkRef` in place of the role-dir regex | landed — `asRoleDirCoordinates` |
| the stale view as a typed refusal | landed — `RoleModViewStaleError` |
| the readout trees via one branch transformer | landed — `asTreeBranchLines` |
| one `getAllRepoDirsOfKind` for the scanners | landed — `role/getAllRepoDirsOfKind.ts`, in `findUniqueRoleDir` and `discoverInitExecutables` |
| onStop and upgrade orchestration out of the contract layer | landed — `mods/genRoleModStopVerdict`, `mods/genRoleModsUncostedReadout`, `mods/getOneRoleModMarkForRoleDir`, `mods/getAllRoleModDriftsOfRepo`; the cli prints and throws |
| one `getOneRoleModState` derivation | landed — the sweep derives each mod's state once and hands the verdicts to `getAllRoleModDrifts` and the pin check. the boot's fresh assert keeps its own derivation, since a boot runs with no sweep |
| one mod-attr transformer | landed — `mods/asRoleModAttr` |
| one `asRoleResourceKind` | landed — `mods/asRoleResourceKind`, in the plan, the hook assert and the sync |
| one matcher in `computeRoleModPlan` | landed — its local `asGlobMatcher` |
| one `not` | landed — `role/getAllRoleBootSpecGlobs`, the one section walk the boot plan and the mod plan both read |
| `asRoleDir` in place of the hand joins | landed — `role/asRoleDir.ts` |
| `genContextCli` in place of `new ContextCli` | kept `new ContextCli` — `genContextCli` is async and the boot and view paths are sync; their callers already hold the repo root, which is all `genContextCli` would derive |
| the supplier resolution reused for the package version | landed — `toRolePackageFromRepo` in `RoleSupplierSlug`, used by the version read, the hook reads and the pin message |
| a hook regex scoped to the role that declares the hook | landed — a `--repo` / `--role` pin, or a bash path, to another role is no conflict |

## .taken, and why

b, in the end. a began the drive: no item is a defect a user meets, and a refactor before review
moves code the commander has not read. the deferral rule then ruled out a, so each item landed here.

the hook regex was the one item with behavior. a hook that called another role's skill of the same
name read as a conflict; it now reads as clear, with three cases that prove it.

## .rework

clean. each item is local to `mods/` or one scanner file.

## .confidence — 85%, and why it is low

- the onStop pester derives the state three times per mod; its cost is reasoned, never timed

## .risk

low. no credential, no prod write. the worst case is a false hook-conflict refusal that names itself.

## .where

- `src/domain.operations/mods/**`
- the scanners that filter `repo=` dirs

## .verdict

closed. every item landed in #702, except `genContextCli`, which is kept as `new ContextCli` for the reason in its row.
