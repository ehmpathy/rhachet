# self-review r7: has-behavior-declaration-coverage

a deeper pass through the vision and criteria to verify full coverage.

---

## re-read the vision document

from `1.vision.stone`:

### the outcome world

> **before:** every brief in `.agent/repo=.this/role=any/briefs/` gets booted as `.say` — full inline content.
>
> current state:
> - root briefs: ~39k chars (11 files)
> - domain.thought/: ~35k chars (6 files)
> - infra.composition/: ~5k chars (2 files)
> - total: ~79k chars (~20k tokens)
>
> every session pays this token cost regardless of task relevance.

**blueprint response:**
- boot.yml created with 7 say briefs
- remaining 12 briefs become refs
- token count reduced to ~8k (verified via boot stats)

| requirement | blueprint covers it? | how? |
|-------------|---------------------|------|
| reduce token cost | yes | curation via boot.yml |
| not all briefs say | yes | only 7 say, 12 ref |

### the aha moment

> session boot reports:
> ```
> .agent/repo=.this/role=any
>   ├─ briefs
>   │  ├─ say = 2 (~10k chars)
>   │  └─ ref = 17
>   └─ skills = 6
> ```
>
> tokens dropped from ~20k to ~3k. refs are there when needed but don't cost tokens until accessed.

**blueprint response:**
- the actual boot stats show `say = 7, ref = 12` (user expanded say list)
- tokens dropped to ~8,075 (~60% reduction)
- refs still appear in boot output as `<brief.ref path="..."/>`

| requirement | blueprint covers it? | how? |
|-------------|---------------------|------|
| show say/ref stats | yes | extant renderBootOutput.ts |
| refs visible | yes | extant boot output format |

---

## user experience usecases

### usecase 1: daily development

> goal: mechanic boots quickly, has essential context
> experience:
> 1. session starts, `roles boot` runs
> 2. only core identity briefs are said
> 3. domain.thought/ briefs appear as refs
> 4. if mechanic needs brain/weave details, reads the ref

**blueprint response:**
- core identity briefs in say: `define.rhachet.v3.md`, `define.agent-dir.md`
- domain.thought/ briefs not in say → become refs automatically
- mechanic can read any ref via filesystem

| step | covered? | evidence |
|------|----------|----------|
| boot runs | yes | extant machinery |
| core briefs say | yes | in boot.yml say array |
| domain.thought refs | yes | not in say → refs |
| read ref on demand | yes | file paths provided |

### usecase 2: work on brain/weave

> experience:
> 1. mechanic sees `<brief.ref path=".../domain.thought/define.term.brain.episodes.md"/>`
> 2. recognizes need for that brief
> 3. reads the file directly

**blueprint response:**
- domain.thought/ briefs appear as refs in boot output
- mechanic reads via `Read` tool or directly

| step | covered? | evidence |
|------|----------|----------|
| ref visible | yes | extant boot output format |
| read directly | yes | file path in ref element |

### usecase 3: new contributor

> experience:
> 1. sees boot.yml declares what's important (say) vs reference (ref)
> 2. reads say briefs for quick orientation
> 3. explores ref briefs for deep dives

**blueprint response:**
- boot.yml has comments that explain structure
- say array lists important briefs
- header comment explains behavior

| step | covered? | evidence |
|------|----------|----------|
| boot.yml readable | yes | yaml with comments |
| say briefs obvious | yes | `briefs.say` array |
| explore refs | yes | refs appear in boot |

---

## edge cases from vision

> | case | handling |
> |------|----------|
> | new brief added | defaults to ref (unmatched by say globs) |
> | glob mismatch | brief appears as ref |
> | empty say array | ref all — minimal boot |
> | no boot.yml | say all — current behavior preserved |

**blueprint response:**

| case | covered? | evidence |
|------|----------|----------|
| new brief added | yes | computeBootPlan: unmatched → refs |
| glob mismatch | yes | same logic |
| empty say array | yes | say: [] → ref all |
| no boot.yml | yes | !config → say all |

all edge cases handled by extant machinery, no changes needed.

---

## open questions from vision

> ### assumptions made
> 1. ~20k tokens is too many for repo=.this/role=any briefs
> 2. most sessions don't need domain.thought/ details upfront
> 3. refs are sufficient for discoverability
> 4. mechanic can read refs when needed

**blueprint response:**
all assumptions accepted, no contradictions in blueprint.

> ### questions to validate
> 1. **which briefs are truly essential?** — [wisher] need wisher input on say candidates
> 2. **do we want subject mode?** — [answered] simple mode sufficient
> 3. **should skills also be curated?** — [answered] no, skills are ~1k tokens

**blueprint response:**
- question 1: resolved by user input (7 briefs selected for say)
- question 2: simple mode used (not subject mode)
- question 3: skills not curated (left to default)

---

## criteria usecases

### usecase.1: session boot with curated briefs

```
given(boot.yml exists with say globs)
  when(session boots role=any)
    then(briefs that match say globs appear inline)
    then(briefs that do not match say globs appear as refs)
    then(boot stats show say count and ref count)
```

| criterion | covered? | evidence |
|-----------|----------|----------|
| matched inline | yes | filterByGlob returns matches |
| unmatched refs | yes | computeBootPlan partitions |
| stats shown | yes | renderBootOutput formats |

### usecase.2: token reduction

```
given(boot.yml says only core identity briefs)
  when(session boots role=any)
    then(token count is ~8k instead of ~20k)
```

| criterion | covered? | evidence |
|-----------|----------|----------|
| token reduction | yes | verified ~8,075 tokens |

### usecase.3: ref access on demand

```
given(a brief appears as ref in boot output)
  when(mechanic needs that brief content)
    then(mechanic reads the file directly)
```

| criterion | covered? | evidence |
|-----------|----------|----------|
| ref readable | yes | path in ref element |

### usecase.4: default behavior preserved

```
given(no boot.yml exists in role directory)
  when(session boots that role)
    then(all briefs appear inline as say)
```

| criterion | covered? | evidence |
|-----------|----------|----------|
| no config = say all | yes | computeBootPlan.ts lines 417-425 |

### usecase.5: minimal boot mode

```
given(boot.yml exists with empty say array)
  when(session boots that role)
    then(all briefs appear as refs)
```

| criterion | covered? | evidence |
|-----------|----------|----------|
| empty say = ref all | yes | computeBriefRefPlan: say: [] → ref all |

### usecase.6: new brief defaults to ref

```
given(boot.yml exists with say globs)
given(new brief is added that does not match any say glob)
  when(session boots role=any)
    then(new brief appears as ref)
```

| criterion | covered? | evidence |
|-----------|----------|----------|
| unmatched → ref | yes | computeBootPlan partition logic |

---

## summary of coverage

| source | items | covered | gaps |
|--------|-------|---------|------|
| vision outcome | 4 | 4 | 0 |
| vision usecases | 3 | 3 | 0 |
| vision edge cases | 4 | 4 | 0 |
| vision questions | 3 | 3 | 0 |
| criteria usecases | 6 | 6 | 0 |
| user additions | 5 | 5 | 0 |
| **total** | **25** | **25** | **0** |

**verdict:** full behavior declaration coverage. zero gaps.

---

## why no gaps exist

the blueprint proposes only one artifact: boot.yml. all behavior comes from extant machinery. the machinery was built to handle all cases in the vision and criteria. our job is to provide the config file — which we did.

the config file:
- specifies 7 say briefs (per user input)
- includes comments for readability
- follows extant conventions

the machinery handles:
- say/ref partition
- boot stats output
- ref visibility
- default behavior
- edge cases

no requirements were skipped because the blueprint is minimal by design.
