# inventory.of=impact — decisions (wisher, 2026-09-26)

| # | idea | decision | why |
|---|---|---|---|
| 1 | gate at render: keep the prior `boot.md` on a breach, exit 2 | ⛔ **rejected** | a `boot.md` render can carry a critical hotfix. a render must never be blocked |
| — | one renderer (R6) | ✅ **required** | only one renderer is allowed. `boot.md` and every budget gate read one render |
| 4 | memoized stop hook, declared by `repo=.this/role=any`, scoped to `.agent/repo=.this` | ✅ **accepted** | as folks edit `.agent/repo=.this` briefs, the hook forces them to hold the boot within budget. cheap fingerprint; count tokens only on a cache miss |
| 5 | a budget on the whole `boot.md` (R9) | ⛔ **rejected** | out of scope for this behavior |
| 3 | hook discovery prunes only `--role` boots (R5) | ✅ **done** | the prune exists to drop default role boots alone. a `--manifest` boot is a different payload, and is kept. `isRolesBootCommand` now requires `--role`, and covers the `rhx boot` alias |
| 2 | CI floor: `roles cost --all` exits 2 on any over-budget spec | ✅ **accepted** | the full roster prints first, then exits 2 for a spec this repo OWNS. a `(linked)` spec over its cap is reported, never refused — this repo cannot edit it (requirement 8) |

## .what the decisions change

- **R3** closes via idea 4, not idea 1. the stop hook is the `.this` enforcer.
- **R4** stays covered at publish by R1 (`repo introspect`). a consumer's hand-edited copy of a linked
  role is no longer caught at render, by choice — the render never blocks.
- **R6** is a settled requirement, not a fulcrum: `setBrainDirBoot` renders through the one renderer
  the gates measure, and never refuses to write.
- **R7** the corollary must now name the stop hook as the `.this` trigger, declared by a role.
- **R9** out of scope.
