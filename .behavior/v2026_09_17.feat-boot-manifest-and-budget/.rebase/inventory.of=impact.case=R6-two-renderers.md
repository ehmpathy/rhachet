# R6 — two renderers

**status:** 🔴 broken (wish requirement 1)

| renderer | owner | feeds |
|---|---|---|
| `getOneRoleBootContent` → `asRoleBootBody` | main | `boot.md`, and main's `roles boot` |
| `genBootPayload` | ours | every budget gate and both `roles cost` arms |

a gate that measures bytes the session does not read can pass an over-budget boot or halt a
compliant one. the repair is one renderer: `setBrainDirBoot` calls the path the gates measure (R3
option A). which of the two survives as the core is a fulcrum — main's is byte-stable with no stats
block (what `boot.md` needs); ours includes the stats blocks in the measured payload (what `roles boot`
stdout needs). likely: ours wraps main's body, and the stats are an emit-only layer.
