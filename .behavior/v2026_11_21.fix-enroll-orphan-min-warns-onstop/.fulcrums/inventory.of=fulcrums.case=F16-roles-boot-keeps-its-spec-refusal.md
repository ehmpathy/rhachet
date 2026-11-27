# F16 — `roles boot` keeps its refusal on a spec that will not parse

- **fork**: render a role whose `boot.yml` will not parse refs-only at `roles boot` too (vision row 10), or keep the refusal there
- **taken**: keep the refusal at `roles boot`; every clone birth, rerender and stop sets the spec aside
- **why**: `roles boot` reads `genBootPayload`, and so does the publish gate (`assertRegistryWithinBudget` at `repo introspect`). a lenient parse in that one payload would let a supplier ship a broken spec unrefused. `roles boot` is a hook read, not a birth (`rule.forbid.content-checks-that-halt-enroll` .scope): the clone is already born when it runs, and the birth's receipt and the stop's hold both name the spec with the parser's line. the boundary-literal half needs no defang there: the cache split happens only in the `boot.md` corpus, and `roles boot` stdout never meets it
- **rework**: clean. a `genBootPayload` option that sets the parse aside, passed by `bootRoleResources` alone, so the publish gate keeps its refusal
- **confidence**: 70%
- **where**: peer review i004 r10 (roles boot refuses an unparseable spec, vision row 10)
- **verdict**: open
