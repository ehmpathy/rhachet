# self-review: has-questioned-requirements

## requirements questioned

### 1. why compile instead of healthcheck?

**original ask:** healthcheck in repo manifest flow that fails if keyrack.yml is absent from dist

**chosen approach:** `rhachet compile` command to replace rsync

**why compile holds:**
- wisher explicitly chose this: "no need to failfast if we eliminate the hazard"
- healthcheck catches the problem; compile eliminates it
- pit of success > safety net

**verdict:** requirement holds — eliminate hazard, don't just detect it

---

### 2. why these specific artifacts?

**included:** briefs, skills, inits, templates, readme.md, boot.yml, keyrack.yml

**evidence:** derived from extant rsync patterns in wish document

**what if we omit one?**
- the original problem persists for that artifact type
- need to audit real-world packages to confirm completeness

**verdict:** requirement holds — minimum set for role distribution. research phase should validate.

---

### 3. why named flags instead of positional args?

**chosen:** `--from src --into dist`
**alternative:** `src/ dist/` like rsync

**why named holds:**
- more explicit, self-documented
- build commands run rarely (once per publish)
- extra keystrokes acceptable for clarity

**verdict:** requirement holds — explicitness > brevity for build commands

---

### 4. why "compile" as the verb?

**chosen:** `rhachet compile`
**alternatives considered:** build, dist, pack, sync

**potential issue:** "compile" suggests transformation, but this is copy-with-defaults

**why it holds:**
- "build" conflicts with tsc build step
- "compile" fits the mental model: "compile role artifacts into distributable form"
- part of the build pipeline alongside tsc

**verdict:** requirement holds, but "dist" could also work. "compile" is defensible.

---

### 5. should --from and --into have defaults?

**vision listed this as open question.**

**analysis:**
- `src` → `dist` is the universal convention
- explicit args add 20 chars to every invocation
- but explicit args prevent accidents (wrong directory)

**recommendation:** no defaults. explicit is safer for build commands. resolved.

---

### 6. should we support `--mode plan`?

**vision listed this as open question.**

**analysis:**
- plan mode useful for destructive operations
- dist/ is typically gitignored, so "damage" is recoverable
- preview adds complexity for marginal benefit

**recommendation:** defer. not required for v1. add if users request. resolved.

---

## summary

| requirement | verdict |
|-------------|---------|
| compile vs healthcheck | holds — eliminate hazard |
| artifact list | holds — validate in research |
| named flags | holds — explicit > terse |
| "compile" verb | holds — fits build pipeline |
| defaults for --from/--into | resolved: no defaults |
| --mode plan | resolved: defer to later |

## what i learned

- question requirements reveals open questions that need resolution (defaults, plan mode)
- the core approach (compile over healthcheck) is sound — wisher explicitly chose it
- research phase should audit real packages to validate artifact list completeness
