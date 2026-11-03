# F1 — the match key is the path relative to the role dir

- **fork**: match a shadow by (a) its path relative to the role dir, (b) its path relative to `briefs/`, or (c) its basename
- **taken**: (a). it is the key `boot.yml` globs already use (`filterBootResourcesByGlob.ts`, `cwd = role dir`), so one key serves the shadow match, the `say:` / `ref:` placement and the `not:` removal; and it spans briefs and skills alike (`briefs/…`, `skills/…`), which S1 put in scope. (c) fails when two briefs share a basename
- **rework**: dirty — every mod dir and every test fixture would carry the chosen key in its paths
- **confidence**: 90% — (b) would need a second key for skills
- **risk**: medium — a wrong key means every mod dir and fixture is rewritten, but a miss is loud: a shadow at the wrong key is a refused unheld file (F2), never a silent wrong boot
- **where**: `1.vision.yield.md` `### the three operations`
- **verdict**: —
