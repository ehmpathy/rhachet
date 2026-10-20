# F11 — the home `CLAUDE.md` excludes cover four home roots, not every one

## .the fork
- A: a glob that matches any `.claude/CLAUDE.md` — it catches every home root, and also excludes every
  `.claude/CLAUDE.md` a repo holds, the repo's own door among them
- B: portable globs, one per known home root — `**/home/*/.claude/CLAUDE.md`,
  `**/Users/*/.claude/CLAUDE.md`, `/root/.claude/CLAUDE.md`, `/github/home/.claude/CLAUDE.md` —
  tracked, the same on every box
- C: the expanded `$HOME` of the box that ran `rhx init` — exact, but a machine-local path in a tracked
  file (S6 forbids it)

## .taken = B, and why
B covers linux, macos, root, and the github actions container HOME — every platform rhachet's ci and
its humans run — and it names no box. A breaks the boot door; C breaks S6.

the first pass measured `/github/home` as a miss and left it; peer r1 blocker.2 named that a deferral.
it is one exact absolute glob, with no over-match, so it landed. the portability clamp's detector
learned that a user segment never opens with a dot, so `/github/home/.claude/` reads as no user.

## .rework = clean
one more glob in `getAllClaudeMdExcludes.ts` per home root found.

## .confidence = 85%, low because
a box with a home outside those roots (a custom `/srv/<user>`) loads its home `CLAUDE.md` in the repo
with no notice. a glob for it would need a guess at every custom root, and `**/*/.claude/CLAUDE.md`
is fork A.

measured under picomatch (`getAllClaudeMdExcludes.test.ts` [case3]):
- hit: `/home/<u>`, `/Users/<u>`, `/root`, `/github/home`, and any home one segment below a `home/`
  dir (`/var/home/<u>`)
- miss: `/srv/<u>`
- over-match: a repo that holds `home/<name>/.claude/CLAUDE.md` (a dotfiles repo) has that file excluded
- never: a repo door or a clone door — a `*` does not cross a `/`

a peer (5.3 l3 r12, i004 and i005) proposes the absolute home path back beside the globs, so a custom
home like `/srv/<u>` is still covered. that path would land in `settings.of.repo.json`, which is
tracked, and seed S6 forbids a machine path in tracked settings
(`trackedBrainDirSettingsArePortable.integration.test.ts` enforces it). so the two requirements
collide only on a home outside the covered roots, and the wisher decides which wins there. a
third way, not built: write the absolute path to an untracked file the clone also reads.

## .where
`src/domain.operations/enroll/getAllClaudeMdExcludes.ts` ·
`src/.test/trackedBrainDirSettingsArePortable.integration.test.ts`

## .verdict
owed — for the wisher at the close.
