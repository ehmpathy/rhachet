# F24 — `RoleContentDefect.detail` stays one nullable field

- **fork**: make `RoleContentDefect` a union keyed by kind, so `spec-unparsed` carries a required `detail` and the other kinds carry none; or keep one shape with `detail: string | null`
- **taken**: keep one shape
- **why**: every surface (receipt, stop readout, stop warn, labels, row tag) reads the defect as one shape and renders `detail` where present. a union forces a narrow at each of those sites for one optional line. `detail` is null by declared reason for two kinds (`rule.forbid.nullable-without-reason`: the field's jsdoc names it), and F10 keeps the defect a plain interface for the same reason
- **counter (i005 r11)**: the field is typed for all kinds but means one
- **answer**: the field holds one sense for every kind, the parser's precise fix; two kinds have none to give. if a second kind gains a detail, the shape already holds it
- **rework**: clean. a union can replace the interface with no change to the scans
- **confidence**: 75%
- **where**: peer review r11 nitpick.3 (i005)
- **verdict**: open
