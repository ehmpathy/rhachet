# F11 — where the receipt takes its arm read

- **fork**: pass `getIsSweepArmed` to `asRoleContentDefectReceiptLines` in its input (a value), or in a `context` arg (a dependency)
- **taken**: in `context`, still lazy
- **why**: the getter reads the repo's arms, which is a dependency the input-context pattern puts in context. a context slot leaves the receipt as pure as before: it still calls the getter only where a defect is set aside, so a clean render pays no read. the input placement rested on a "context marks it impure" claim that does not hold
- **rework**: clean. three call sites and one unit file, done
- **confidence**: 90%
- **where**: peer review i001 r7 nitpick.2, i003 r7 nitpick.3
- **verdict**: reversed at i003 r7 nitpick.3, in favor of the reviewer
