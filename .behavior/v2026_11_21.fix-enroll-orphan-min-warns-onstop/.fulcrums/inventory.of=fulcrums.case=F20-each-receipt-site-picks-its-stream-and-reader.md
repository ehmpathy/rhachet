# F20 — each receipt site picks its own stream and reader

- **fork**: one `setRoleContentDefectReceiptEmitted({ defects, for, repoPath })` that every site calls; or each site composes the pure `asRoleContentDefectReceiptLines` and emits it itself
- **taken**: each site composes the pure transformer and emits it itself
- **why**: the sites differ in what they emit, not only where
  - enroll writes stderr and adds `defects` to its json and `--async` handoffs
  - `syncAndReportBrainDirBoots` dedupes across every brain dir it renders before it writes
  - the roster speaks to a human (`for: 'human'`) after its rows
  - an emitter that served all three would take a stream, a dedupe, and a reader as inputs, which is the call site again
- **counter (i004 r11)**: a fourth `setBrainDirBoot` caller that forgets the receipt sets a defect aside silently, which the rule calls a blocker
- **answer**: the defect does not stay silent. every owned defect holds the next armed stop, through its own scan, whether or not a birth printed a receipt (F6). `setBrainDirBoot` returns `defects` on its `BrainDirBootRender`, so a caller sees the field in its type. the rule brief's when-table names the receipt as owed at each birth site
- **rework**: clean. an emitter can be extracted once a fourth site shows the shape the three share
- **confidence**: 70%
- **where**: peer review r11 blocker.6 (i004)
- **verdict**: open
