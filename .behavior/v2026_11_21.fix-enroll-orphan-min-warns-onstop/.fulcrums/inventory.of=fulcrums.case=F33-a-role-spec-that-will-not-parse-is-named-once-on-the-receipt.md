# F33 — a role spec that will not parse is named once, on the receipt, not again on stderr

- **fork**: keep the sweep's stderr notice (`🟡 a boot spec could not be read`) for a role spec that will not parse, beside the new stdout receipt; or name it once, on the receipt
- **taken**: once, on the receipt. the sweep's stderr notice stays for a spec that is no role (a route manifest, `roles.cost` [case10.1])
- **why**:
  - a role spec that will not parse is a content defect now. the render sets it aside and boots the role refs-only, and the same `🟡 boot set aside` receipt names it with the parser's line and its fix, as it names every other kind. a second notice on stderr would name one fault twice, in two shapes, on two streams
  - the old stderr notice said the spec was "absent from the roster below"; the receipt says more: what the boot does with the role (refs-only) and the parser's own line
  - the old truths still hold at the receipt: the 🟡 glyph (never `✋`), `role=broken` named, the roster above free of it, exit 0
- **counter (5.3 i005 r12 blocker.1)**: this arm already exited 0 and warned, so the wish forced no change here
- **answer**: the change is forced by the render, not by this arm: one render, one defect list, one receipt per caller (F29). the alternative is a per-caller exception that names one spec two ways
- **rework**: clean. let the sweep's per-spec catch print its notice for role specs too
- **confidence**: 75%
- **where**: 5.3 peer review i004 r12 blocker.1, i005 r12 blocker.1
- **verdict**: open
