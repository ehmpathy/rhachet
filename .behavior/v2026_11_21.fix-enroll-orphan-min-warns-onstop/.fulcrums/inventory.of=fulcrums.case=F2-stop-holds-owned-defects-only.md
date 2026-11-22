# F2 — the stop holds for owned defects only

- **fork**: the stop could hold for every content defect in every booted role, or only for defects in `.agent/repo=.this` roles
- **taken**: owned only. linked defects show on the 🟡 birth row (with owner and levers), as a 🟡 mark in `roles cost --all`, and at the stop as a JSON warn on exit 0 that holds naught (`systemMessage` / `additionalContext`, per https://code.claude.com/docs/en/hooks.md#exit-code-output); plain exit-0 output reaches no one
- **why**: the budget arm holds only for owned specs (`getOneRepoThisBootFingerprint.ts:12-18`: a linked role is its supplier's). a hold on every stop for a file this repo does not own is an overzealous blocker
- **rework**: clean. widen the sweep's role filter; the readout already names owners
- **confidence**: 70%. the incident's two orphans may have been in a linked role, and "so a clone ... can repair it" may mean a hold the wisher wants there too
- **where**: `1.vision.yield.md` `.open questions`; `case=2`
- **verdict**: open
