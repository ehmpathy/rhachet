# self-review r6: has-behavior-declaration-coverage

reviewed the blueprint against vision and criteria for coverage gaps.

---

## vision requirements check

### requirement 1: boot.yml controls say vs ref

from vision:
> a `boot.yml` controls which briefs are said vs reffed

| covered? | evidence |
|----------|----------|
| yes | blueprint proposes boot.yml with `briefs.say` array |

### requirement 2: unmatched briefs become refs automatically

from vision:
> unmatched briefs become refs automatically — no need for explicit ref globs

| covered? | evidence |
|----------|----------|
| yes | computeBootPlan.ts handles this (extant behavior) |

### requirement 3: token reduction

from vision:
> tokens dropped from ~20k to ~3k

| covered? | evidence |
|----------|----------|
| yes | blueprint expected result: "~8k tokens (7 say, 12 ref)" |

note: slightly different numbers due to user additions, but reduction achieved.

### requirement 4: ref access on demand

from vision:
> if mechanic needs brain/weave details, reads the ref

| covered? | evidence |
|----------|----------|
| yes | refs appear in boot output, mechanic can read directly |

### requirement 5: default behavior preserved

from vision:
> no boot.yml | say all — current behavior preserved

| covered? | evidence |
|----------|----------|
| yes | extant machinery handles this (computeBootPlan.ts) |

---

## criteria check

### usecase.1: session boot with curated briefs

```
given(boot.yml exists with say globs)
  when(session boots role=any)
    then(briefs that match say globs appear inline)
    then(briefs that do not match say globs appear as refs)
    then(boot stats show say count and ref count)
```

| covered? | evidence |
|----------|----------|
| yes | boot.yml has 7 say globs, extant machinery outputs stats |

### usecase.2: token reduction

```
given(boot.yml says only core identity briefs)
  when(session boots role=any)
    then(token count is ~8k instead of ~20k)
```

| covered? | evidence |
|----------|----------|
| yes | boot stats confirmed: ~8,075 tokens (~60% reduction) |

### usecase.3: ref access on demand

```
given(a brief appears as ref in boot output)
  when(mechanic needs that brief content)
    then(mechanic reads the file directly)
```

| covered? | evidence |
|----------|----------|
| yes | ref briefs have paths, mechanic can read via filesystem |

### usecase.4: default behavior preserved

```
given(no boot.yml exists in role directory)
  when(session boots that role)
    then(all briefs appear inline as say)
```

| covered? | evidence |
|----------|----------|
| yes | extant machinery handles this (computeBootPlan.ts lines 417-425) |

### usecase.5: minimal boot mode

```
given(boot.yml exists with empty say array)
  when(session boots that role)
    then(all briefs appear as refs)
```

| covered? | evidence |
|----------|----------|
| yes | extant machinery handles this (say: [] → ref all) |

### usecase.6: new brief defaults to ref

```
given(boot.yml exists with say globs)
given(new brief is added that does not match any say glob)
  when(session boots role=any)
    then(new brief appears as ref)
```

| covered? | evidence |
|----------|----------|
| yes | extant machinery handles this (unmatched → refs) |

---

## gap analysis

| requirement source | total items | covered | gaps |
|--------------------|-------------|---------|------|
| vision | 5 | 5 | 0 |
| criteria | 6 | 6 | 0 |

**gaps found:** zero

---

## verification: no omitted requirements

re-read the wish:

> the briefs booted from .agent/repo=.this/role=any/briefs are too large
> we should use the boot.yml capacity and drop a boot.yml in that role
> so that we can control which ones are said vs reffed
> not all of them need to be said, refs are often times more than sufficient!

| wish element | addressed? |
|--------------|------------|
| briefs too large | yes — reduced via curation |
| use boot.yml | yes — boot.yml created |
| control say vs ref | yes — briefs.say array |
| refs sufficient | yes — 12 briefs now refs |

---

## user additions verification

user explicitly requested 5 additional briefs to say:

```
# actively used patterns
- briefs/howto.test-local-rhachet.md
- briefs/bin.dispatcher.pattern.md
- briefs/run.executable.lookup.pattern.md
# test patterns (frequently referenced)
- briefs/code.test.accept.blackbox.md
- briefs/rule.require.shared-test-fixtures.md
```

| brief | in boot.yml? |
|-------|--------------|
| howto.test-local-rhachet.md | yes |
| bin.dispatcher.pattern.md | yes |
| run.executable.lookup.pattern.md | yes |
| code.test.accept.blackbox.md | yes |
| rule.require.shared-test-fixtures.md | yes |

all user-requested briefs included.

---

## summary

| coverage area | status |
|---------------|--------|
| vision requirements | 5/5 covered |
| criteria usecases | 6/6 covered |
| wish elements | 4/4 covered |
| user additions | 5/5 covered |

**verdict:** full behavior declaration coverage. no gaps found.
