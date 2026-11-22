# F35 — a defect's rows read fact, then levers, then cause

- **fork**: for a linked `spec-unparsed` defect, keep the rows as fact + lever, `or` levers, then the parser's cause; or move the cause up, beneath the fact
- **taken**: keep one order for every defect: the note rows (`asRoleContentDefectNote`), then the `detail` row, if any
- **why**:
  - a linked note's first row carries its first lever (`— upgrade via rhx upgrade`), and the `or …` rows continue it. a cause placed after the first row splits one lever list in two
  - an owned note is one row, so its cause already sits beneath it. one order serves both, and the owned row's fix (`repair what the row below names`) points at the row that follows
  - the cause row names itself (`boot.yml has invalid yaml — …`), so its place in the branch does not hide what it is
- **bound**: no row text changes; the order holds for every kind and owner
- **rework**: clean. a reorder in `asRoleContentDefectLines.ts`, and the linked spec snaps
- **confidence**: 70%
- **counter (5.3 i006 r11 nitpick.1)**: the linked cause hangs after the `or report` row, below what reads as the end of the lever list; the owned row puts its cause right below the lead
- **answer**: the inversion is the cost of one lever list that stays whole. a fold of the levers into the last row would put three levers on one line
- **where**: 5.3 peer review i006 r11 nitpick.1
- **verdict**: open
