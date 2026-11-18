# F4 — the version pester fails the stop, never the upgrade; mods still render

- **fork**: where a role-version drift gates — (a) `rhx upgrade` exits 2, (b) the onStop sweep exits 2 and the upgrade only notes it, (c) the render refuses the mods until the `@version` in `of:` is bumped
- **taken**: (b). the wisher named the onStop pester, after the budget's shape (S2). an upgrade that fails would block a ci upgrade bot; a render that refuses would halt every clone's boot until someone acts. the stop is the moment the author is present
- **rework**: clean — which command exits 2
- **confidence**: 75% — the upgrade notice at exit 0 is my call, not the wisher's
- **risk**: low — the wrong gate is a moved exit code; no render or upgrade is held
- **where**: `1.vision.yield.md` `### the version pester`; case 5
- **verdict**: (b) stands, by F23 reversed to (a), the commander, 2026-11-17 (seed S11). the stop
  sweep exits 2 on a drifted pin; the upgrade names it at exit 0; the boot names it in its notice.
  (from 2026-11-09 to 2026-11-17, F23 (b), the director, seed S9, had moved the pester off the stop)
