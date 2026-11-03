# F9 — the mod's boot.yml sections are read before the role's

- **fork**: how the mod's plan merges with the role's — (a) append the mod's lists after the role's, (b) read the mod's sections first
- **taken**: (b). boot is first-say-wins (`computeBootPlan.ts`), so read-first gives placement overrides (say → ref, ref → say) and `not:` removals for free, with no new rule — the mod's boot.yml is the role's schema, read first. (a) could only add
- **rework**: clean — the merge order is one line
- **confidence**: 80% — a read-first `say:` of a held path silently re-places it; the boot tag names the mod, so it is not silent to a reader
- **risk**: medium — read-first can silently re-place a held brief (say ↔ ref), which shifts what a clone boots with; the boot tag names the mod, so a reader can see it, but no gate stops it
- **where**: `1.vision.yield.md` `### the three operations`
- **verdict**: —
