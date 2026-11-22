# F5 — an unparseable boot.yml renders its role refs-only

- **fork**: a role whose spec fails to parse could render (a) say-all, as if no spec, (b) not at all, or (c) refs-only: readme said, every brief and skill as a ref
- **taken**: (c)
- **why**: (a) is the downgrade `getOneRoleBootSpecFromRef.ts:14-17` forbids, and can blow the budget. (b) births a clone without a role it asked for, an identity change. (c) keeps every file addressable at path-line cost
- **a focus on a refs-only role** (i003 r6 nitpick.1): a subject is declared in the role's own `boot.yml`, so where that file will not parse, no subject exists to focus on. the render cannot narrow to `role::subject` without the spec that defines the subject, and refs-only says no file whole, so the focus bounds no said bytes it would otherwise have kept. the defect row already names the cause and its fix (`fix the boot.yml at the line the parser names`), and the repair restores the focus
- **rework**: clean. the fallback is one branch in the render
- **confidence**: 65%. a broken spec has no faithful render, so any fallback is a judgment; the wisher may prefer to keep this one a halt (then it moves to the identity allowlist, F1)
- **where**: `1.vision.yield.md`; `case=4`
- **verdict**: open
