# F26 — the linked lever text stays per row, and the report names the package's owner

- **fork**: read the owner from the linked package's `package.json` (`bugs.url`, `repository`) and say the levers once per role; or keep one full note per defect row, the report addressed to the package by name
- **taken**: one note per row. the report reads `or report <kind> in repo=<slug>/role=<role> to the owner of the rhachet-roles-<slug> package` (a role repo ships as `rhachet-roles-<slug>`). it names no supplier skill, since a repo may link none. the `<kind>` is the defect's own kind slug, the token the json handoff carries, so a report and a machine read name one defect the same way
- **why**: each row is a whole repair a reader can act on alone; the stop warn, the roster and the receipt all render rows by one transformer (`asRoleContentDefectNote`), which is pure. an owner read adds a package lookup to every scan, and `package.json` names a url, not always a github repo slug. a long supplier list of orphans is rare: no package this repo links ships one
- **counter (i006 r10)**: the report lever is not runnable; 12 orphans print ~4 KB on each released stop, the same sentence 12 times; `radio.task.push` ships only with `bhuild/role=dispatcher`
- **answer**: the bulk shape and the owner read are real and belong together: `.dream/v2026_11_21.feature.linked-defect-levers-once-per-role.md` holds both, plus a clamp that follows each lever to its end
- **rework**: clean. a group by role in `asRoleContentDefectLines`, the owner on `RoleContentDefect.ref`
- **confidence**: 70%
- **where**: peer review r10 nitpick.1, nitpick.2 (i006); 5.3 i004 r11 nitpick.5
- **verdict**: open
