# self-review r2: has-questioned-assumptions

re-read the blueprint with fresh eyes. found deeper assumptions to examine.

---

## assumption 1: the boot.yml already exists

**what we assume:** the blueprint says "[+] create" but we already created boot.yml earlier in this behavior route.

**evidence:** `git status` shows boot.yml as staged:
```
A  .agent/repo=.this/role=any/boot.yml
```

**is this an issue?** no. the blueprint documents what was built. the work is done. the blueprint is accurate — we did create a new file.

**verdict:** holds — blueprint describes completed work ✓

---

## assumption 2: glob paths are relative to role directory

**what we assume:** globs like `briefs/define.rhachet.v3.md` match relative to `.agent/repo=.this/role=any/`.

**evidence:** tested empirically. globs with `briefs/` prefix matched 7 files. globs without prefix matched 0 files.

**code verification:** filterByGlob.ts uses `fast-glob` with `cwd` set to role directory. `pathToOriginal` contains the relative path from role dir.

**what if opposite?** if globs matched from repo root, we would need full paths like `.agent/repo=.this/role=any/briefs/define.rhachet.v3.md`. but this is not how the machinery works.

**verdict:** holds — verified in code and empirically ✓

---

## assumption 3: minified briefs are respected

**what we assume:** some briefs have `.min.md` variants. the machinery handles these correctly.

**evidence:** brief refs have `pathToOriginal` that points to the `.md` file while `pathToMinified` points to the `.min.md` variant if it exists.

**code verification:** computeBootPlan.ts line 72:
```ts
getMatchPath: (ref) => ref.pathToOriginal,
```

globs match against `pathToOriginal`. the content is served from `pathToMinified` if available.

**what if opposite?** if globs matched against minified paths, we would need to use `.min.md` in globs. but that would be confusing.

**verdict:** holds — globs match original, content from minified ✓

---

## assumption 4: ref briefs are still discoverable

**what we assume:** briefs that become refs are still visible in boot output.

**evidence:** vision doc usecase 2:
> mechanic sees `<brief.ref path=".../domain.thought/define.term.brain.episodes.md"/>`

boot output includes both say briefs (inline) and ref briefs (as pointers).

**what if opposite?** if ref briefs were hidden, discoverability would be lost. but the vision explicitly states refs are visible.

**verdict:** holds — refs appear in boot output ✓

---

## assumption 5: no skills curation needed

**what we assume:** the blueprint says skills don't need curation. but what if they do?

**evidence:** boot stats show:
```
skills = 6
  ├── say = 6
  └── ref = 0
```

all 6 skills are said. total skill content is ~1k tokens.

**what if opposite?** we could add `skills.say` to boot.yml if skills grew larger. but the vision explicitly states skills are ~1k tokens — not worth curation overhead.

**verdict:** holds — skills are small, user can add curation later if needed ✓

---

## assumption 6: boot.yml format is stable

**what we assume:** the yaml schema for boot.yml is stable and won't break.

**evidence:**
- `parseRoleBootYaml.ts` uses zod validation
- `schemaRoleBootSpecSimplified` enforces the schema
- tests in `parseRoleBootYaml.test.ts` verify parsing

**what if opposite?** if schema changed, old boot.yml files would fail validation. but schema changes are managed by the machinery maintainers, not by this wish.

**verdict:** holds — out of scope, machinery is stable ✓

---

## found issues

none. all assumptions are verified.

---

## summary

| assumption | evidence type | verdict |
|------------|---------------|---------|
| boot.yml already exists | git status | holds — work done |
| glob paths relative to role | code + empirical | holds |
| minified briefs respected | code analysis | holds |
| ref briefs discoverable | vision doc | holds |
| no skills curation needed | boot stats | holds — can add later |
| boot.yml format stable | zod schema + tests | holds — out of scope |

the blueprint is based on verified behavior with no hidden assumptions.
