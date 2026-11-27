# F04 — the gate skips a mod on an allowlist of fault classes

- **fork**: the mod gate catches (a) `ConstraintError` alone, as before · (b) `ConstraintError` and `MalfunctionError` · (c) every error except a code defect (`isCodeDefectError`, a denylist) · (d) an allowlist: `ConstraintError`, `MalfunctionError`, or an `Error` with a string errno `code`
- **taken**: (d). C11 (a corrupt record) is a `MalfunctionError`; C13 (`ENOTDIR`, `EACCES` on the mods path) is a raw errno. so (b) misses C13. a peer review refuted (c): an unclassed `new Error` from a helper defect, or a thrown non-Error value, would be named as a mod fault. under (d) all else rethrows loud (`asRoleModFaultOrNull`), so `rule.forbid.failhide` holds
- **rework**: clean — one predicate, `asRoleModFaultOrNull`
- **confidence**: 90%
- **where**: `getOneRoleModVerdict.ts`, `asRoleModFaultOrNull.ts`; proven by `getOneRoleModVerdict.test.ts` cases 3–8
- **verdict**: revised from (c) to (d) after peer review r1.b1 · r2.b1 · r6.b1
