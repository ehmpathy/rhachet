# F4 — a boundary literal in a brief renders defanged

- **fork**: on a brief that holds the cache-boundary literal, the render could (a) refuse as today, (b) drop that brief, (c) drop that role, or (d) defang that one line and keep the rest
- **taken**: (d). replace the literal line in that body with a marker that holds no copy of it
- **why**: the corpus count check (`asBootCorpusWithCacheBoundary.ts:43-51`) still proves one boundary, so the mis-split the strict refusal feared cannot occur. (b) and (c) lose more content than the defect warrants
- **rework**: clean. one transformer at the corpus join
- **confidence**: 70%. whether an inline (not own-line) copy also splits is unmeasured (`assertRoleBootsFreeOfCacheBoundary.ts:11`); a defang of every occurrence, not only own-line ones, covers both
- **where**: `1.vision.yield.md`; `case=3`
- **verdict**: open
