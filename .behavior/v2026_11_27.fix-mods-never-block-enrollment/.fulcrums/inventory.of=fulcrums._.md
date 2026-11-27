# inventory.of=fulcrums — v2026_11_27.fix-mods-never-block-enrollment

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F01 | `rhx init` exits 0 on a mod fault, not 2 | clean | ruled (b) by the director, 2026-11-27 | 100% |
| F02 | the stop holds (exit 2) on a mod fault at each turn's first stop; a stop claude already held passes | clean | best-guessed, revised after review | 85% |
| F03 | a skipped mod is skipped by real path: no file under `.agent/repo=.mods/` boots | clean | best-guessed | 85% |
| F04 | the gate skips a mod on an allowlist: `ConstraintError`, `MalfunctionError`, or an errno | clean | best-guessed, revised after review | 90% |
| F05 | `roles boot` and `roles cost` read the same tolerant gate as enroll | clean | best-guessed | 75% |
| F06 | a skipped role boots its published files, read from the view record; the boot glob match runs in memory | clean | best-guessed | 85% |
| F07 | a key-free integration suite is run and resnapped locally under the lenient acceptance setup (`credfree --what integration`) | clean | best-guessed | 85% |
| F08 | init names a skipped mod on stdout, in its one mod-views tree; enroll names it on stderr | clean | best-guessed | 80% |
| F09 | the stop hold header names the hold's class (`ConstraintError`, exit 2); each member line keeps its own | clean | best-guessed | 80% |
| F10 | brains and mods read each other, each through one public operation; the mods→brains edge is lazy | clean | best-guessed | 75% |
| F11 | a mod fault stays the error class it is raised as; its readouts read its metadata through two readers | clean | best-guessed | 75% |
| F12 | the PR carries the route's own files, each named in its body; the human's uncommitted edits stay out | clean | best-guessed | 85% |
| F13 | the pnpm patch is cut from the settled design, after review, beside the PR | clean | best-guessed | 85% |
| F14 | the stop sweep keeps each fault; the render readout names each role once | clean | best-guessed | 85% |
| F15 | the stop header's words and upgrade's fault set land in this diff | clean | ruled (a) on 5.3 r1 blocker.1 | 90% |
| F16 | the render and the stop sweep share each check, never one walk; "carried" decides only where a fault is named | clean | best-guessed | 75% |
| F17 | the skill lookup, the stray collision, and three coverage adds land here; the fault-shape reshape is its own PR | clean | ruled (b) on 5.3 r1 blocker.1 | 85% |
| F18 | the stop sweep is armed by the hook sync; a first mod added after the last init arms it at the next init | clean | best-guessed | 70% |
| F19 | every stop hold ends on its tree, with no cli error tail below it | clean | ruled (b) on 5.3 r1 blocker.1 | 90% |
| F20 | the skip notice names its mod dir on a `mod =` line, beside `fix =`, never as a tag attr | clean | best-guessed | 85% |
| F21 | the stop hold's header names the class of the hold, never of each fault | clean | disputed (5.3 r6 nitpick.2) | 80% |
| F22 | the new mods orchestrators are proven through the suites that compose them | clean | disputed (5.3 r3 nitpick.2) | 75% |
| F23 | an empty placeholder concern names no defect, so it is disputed, not conceded | clean | disputed (5.3 r1 blocker.1) | 90% |
| F24 | the pnpm patch routes the bun fast path through jit, since a text patch cannot carry the rebuilt `.bc` binaries | clean | best-guessed | 85% |