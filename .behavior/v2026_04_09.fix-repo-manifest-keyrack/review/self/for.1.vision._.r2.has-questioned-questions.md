# self-review: has-questioned-questions

## triage of open questions

### from vision document

#### q1: should --from and --into have defaults?

**can answer via logic now?** yes

**answer:** no defaults. explicit args prevent accidents. build commands benefit from clarity over brevity.

**status:** [answered]

---

#### q2: should we support `rhachet compile --mode plan`?

**can answer via logic now?** yes

**answer:** defer to v2. dist/ is typically gitignored, so preview is less critical than for destructive operations. add complexity only if users request.

**status:** [answered]

---

#### q3: should we validate that src/ contains role structure?

**can answer via logic now?** partially

**answer:** fail-fast if src/ does not exist. beyond that, do not validate role structure — user may have custom layouts. keep it simple.

**status:** [answered]

---

### from self-reviews

#### q4: should empty dirs be pruned?

**can answer via extant code?** yes — rsync uses `--prune-empty-dirs`

**answer:** yes, prune empty dirs. matches extant behavior.

**status:** [answered]

---

#### q5: should readme.md pattern be case-insensitive?

**can answer via research?** yes — depends on rsync/glob behavior on different OS

**answer:** research how to match README.md, Readme.md, readme.md across platforms.

**status:** [research]

---

#### q6: what happens if dist/ has uncommitted changes?

**can answer via logic now?** yes

**answer:** rhachet compile adds files to dist/, does not delete. uncommitted changes in dist/ are preserved. however, if user expects clean dist/, they should rm -rf dist/ first. this is standard build pipeline behavior — not rhachet compile's responsibility.

**status:** [answered]

---

#### q7: should compile fail-fast if not in package root?

**can answer via logic now?** yes

**answer:** yes. check for package.json in cwd. fail-fast with clear error if absent.

**status:** [answered]

---

## summary

| question | status | answer |
|----------|--------|--------|
| defaults for --from/--into | [answered] | no defaults, explicit is safer |
| --mode plan | [answered] | defer to v2 |
| validate role structure | [answered] | no, only check src/ exists |
| prune empty dirs | [answered] | yes, matches rsync |
| case-insensitive readme | [research] | needs platform research |
| uncommitted dist/ changes | [answered] | not our problem, add don't delete |
| fail-fast on no package.json | [answered] | yes |

## actions

1. update vision: mark questions as answered
2. add to research phase: case-insensitive readme.md pattern
3. add edgecase: no package.json → fail-fast
