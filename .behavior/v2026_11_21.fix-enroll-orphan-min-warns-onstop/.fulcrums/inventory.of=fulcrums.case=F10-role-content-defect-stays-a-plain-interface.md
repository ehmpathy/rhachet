# F10 — `RoleContentDefect` stays a plain interface

- **fork**: declare the defect as a `DomainLiteral` with `.build()`, or as a plain interface
- **taken**: a plain interface
- **why**: the defect is a transient report, made by a render and read by a receipt in the same run, never persisted, compared, or hydrated. its neighbours of that kind in `src/domain.objects/` are plain structural types too (`RoleLinkRef`, the `ref` it carries). a class would add a construction ceremony at three sites and to every fixture, with no identity or validation to earn it
- **rework**: clean. wrap the interface in a `DomainLiteral` and `.build()` at the three construction sites
- **confidence**: 80%
- **where**: peer review r5 nitpick.1; `src/domain.objects/RoleContentDefect.ts`
- **verdict**: open
