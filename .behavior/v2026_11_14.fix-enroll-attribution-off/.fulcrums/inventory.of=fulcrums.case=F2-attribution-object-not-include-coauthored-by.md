# F2: `attribution` object form, not `includeCoAuthoredBy`

- **the fork**: (a) `"attribution": { "commit": "", "pr": "" }` · (b) `"attribution": false` ·
  (c) `"includeCoAuthoredBy": false` · (d) both (a) and (c)
- **taken**: (a)
- **why**: claude 2.1.325's schema names the object form as the cross-version shape (older versions
  reject the boolean). `includeCoAuthoredBy` is deprecated and its read fires a dead-probe event, so
  a future version may drop it; (a) alone yields empty commit + pr text and no reminder
- **rework**: clean — a second key is one more line
- **confidence**: 92% — a very old claude that predates `attribution` would ignore (a); (d) would
  cover it at the cost of a deprecated key. rhachet pins no claude version (`package.json` names
  none); the test probe installs latest and hosts track the grove's provision, so a current claude
  is the norm and (a) holds
- **where**: same writer as F1
- **verdict**: —
