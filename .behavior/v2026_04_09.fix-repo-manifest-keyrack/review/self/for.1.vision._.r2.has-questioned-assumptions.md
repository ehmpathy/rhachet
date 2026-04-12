# self-review r2: has-questioned-assumptions

## deeper dig — additional hidden assumptions

### 7. `npx rhachet` assumes rhachet is available in role package context

**surfaced:** command is `npx rhachet compile --from src --into dist`

**what i assumed:** rhachet is installed as dev dependency in role packages

**evidence:** role packages already import from rhachet-roles-* which depend on rhachet

**what if opposite were true?** user would need to install rhachet explicitly

**verdict:** holds — rhachet is transitive dependency. could document explicitly.

---

### 8. build timeline: tsc outputs first, rhachet compile copies after

**surfaced:** line 82: "npm run build (which includes tsc + rhachet compile)"

**what i assumed:** tsc compiles TS to dist/, then rhachet compile adds role artifacts

**what if tsc outputs elsewhere?** rhachet compile would copy to wrong place or miss tsc output

**evidence:** standard convention is tsc → dist/

**verdict:** holds — but rhachet compile should not delete dist/ contents, only add to it. this is implicit but should be explicit.

---

### 9. copy semantics — artifacts should be copied, not symlinked

**surfaced:** vision assumes file copy from src/ to dist/

**alternative:** symlinks would save disk space

**why copy holds:** npm publish follows symlinks anyway, and symlinks add complexity

**verdict:** holds — copy is simpler, more portable.

---

### 10. `--prune-empty-dirs` behavior

**surfaced:** extant rsync has `--prune-empty-dirs`, vision doesn't mention it

**what if empty dirs should be kept?** some tools might expect them

**evidence:** role artifacts are files, not dirs. empty dirs are likely accidental.

**verdict:** should prune empty dirs. add to implementation notes.

---

### 11. command runs from package root

**surfaced:** command assumes cwd is package root

**what if run from subdirectory?** paths would compute incorrectly

**verdict:** rhachet compile should fail-fast if not in package root (check for package.json). add to edgecases.

---

### 12. consumers find artifacts via package.json

**surfaced:** vision says "consumers install and get complete role"

**what i assumed:** package.json "files" field includes dist/

**if not configured:** consumers get empty package

**verdict:** this is user responsibility, not rhachet compile scope. but could document.

---

### 13. readme.md is case-insensitive?

**surfaced:** pattern is `**/readme.md`

**reality:** README.md, Readme.md, etc. are common

**evidence:** extant rsync uses `**/readme.md` (lowercase)

**verdict:** should be case-insensitive. check if rsync/glob handles this or needs explicit patterns.

---

## actions from r2

1. implementation: do not clear dist/ before copy (tsc output must survive)
2. implementation: prune empty dirs (match rsync behavior)
3. edgecase: fail-fast if not in package root (no package.json)
4. research: verify case-insensitivity of readme.md pattern

## what i learned

round 1 found 6 assumptions. round 2 found 7 more. slower review surfaces deeper issues. the "build timeline" assumption (tsc first, then compile) reveals an important constraint: compile must not delete extant dist/ contents.
