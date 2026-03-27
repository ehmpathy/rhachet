# self-review r2: has-vision-coverage

double-check: does the playtest cover all behaviors?

---

## step 1: read the wish verbatim

### 0.wish.md content (line by line)

```
line 3: the briefs booted from .agent/repo=.this/role=any/briefs are too large
line 5: we should use the boot.yml capacity and drop a boot.yml in that role
line 7: so that we can control which ones are said vs reffed
line 9: not all of them need to be said, refs are often times more than sufficient!
```

### extracted requirements from wish

| line | requirement | testable? |
|------|-------------|-----------|
| 3 | briefs are too large | yes — measure token count |
| 5 | use boot.yml capacity | yes — verify boot.yml is used |
| 7 | control say vs ref | yes — verify partition works |
| 9 | refs are sufficient | yes — verify refs appear |

---

## step 2: map wish requirements to playtest

### requirement: "briefs are too large"

**what does "too large" mean?**

the vision says:
- before: ~79k chars (~20k tokens)
- after: ~8k tokens

so "too large" = ~20k tokens baseline.

**playtest coverage:**
- step 1: verifies tokens ≈ 8k (reduced)
- edge 1: verifies baseline ~20k (absent boot.yml)

**is this complete?**

yes. the playtest proves:
1. baseline is ~20k (edge 1)
2. with boot.yml is ~8k (step 1)
3. reduction is ~60% (implicit from 1 and 2)

### requirement: "use boot.yml capacity"

**what does "use boot.yml capacity" mean?**

it means: boot.yml controls the partition.

**playtest coverage:**
- step 1: verifies boot.yml applies partition (stats show say=7, ref=12)
- steps 2-3: verify partition details

**is this complete?**

yes. the playtest proves boot.yml is used by verification of the partition effect.

### requirement: "control say vs ref"

**what does "control say vs ref" mean?**

it means:
1. say globs determine which briefs are inline
2. unmatched briefs become refs

**playtest coverage:**
- step 2: verifies 7 specific briefs are say (inline)
- step 3: verifies unmatched briefs are ref (pointer only)

**is this complete?**

yes. the playtest proves control via explicit verification of both say and ref sets.

### requirement: "refs are sufficient"

**what does "refs are sufficient" mean?**

it means: refs provide enough discoverability that not all briefs need to be said.

**playtest coverage:**
- step 3: verifies refs appear with paths
- implicit: foreman can read ref files directly

**is this complete?**

partially. the playtest proves refs appear, but doesn't explicitly prove "sufficiency". however, sufficiency is subjective — the wish expresses a belief ("refs are often times more than sufficient"), not a testable behavior.

---

## step 3: read the vision usecases

### vision usecase 1: daily development

> goal: mechanic boots quickly, has essential context

**playtest coverage:**
- step 1: verifies reduced token count (boots faster)
- step 2: verifies essential briefs are said (has context)

**complete?** yes.

### vision usecase 2: ref access

> goal: mechanic can read refs when needed

**playtest coverage:**
- step 3: verifies refs appear with paths
- implicit: files are readable at those paths

**complete?** yes (implicit coverage is acceptable — file readability is a filesystem feature, not a boot.yml feature).

### vision usecase 3: new contributor orientation

> goal: understand what this repo is about by exploration of .agent/

**playtest coverage:**
- not explicitly covered

**is this a gap?**

no. this usecase describes a UX pattern (filesystem exploration), not a boot.yml behavior. the boot.yml doesn't change how files are organized — it only changes what appears in boot output.

the playtest correctly focuses on observable boot output, not filesystem exploration.

---

## step 4: verify vision outcomes

### outcome V4: before ~20k tokens

**playtest coverage:**
- edge 1: verifies absent boot.yml = ~20k tokens

**complete?** yes.

### outcome V5: after ~8k tokens

**playtest coverage:**
- step 1: verifies tokens ≈ 8k

**complete?** yes.

### outcome V6: boot.yml controls partition

**playtest coverage:**
- steps 1-3: verify partition effect

**complete?** yes.

### outcome V7: unmatched briefs become refs

**playtest coverage:**
- step 3: verifies unmatched briefs appear as refs

**complete?** yes.

### outcome V8: stats show counts

**playtest coverage:**
- step 1: verifies stats show say=7, ref=12

**complete?** yes.

### outcome V9: default behavior preserved

**playtest coverage:**
- edge 1: verifies absent boot.yml = say all

**complete?** yes.

---

## step 5: identify any gaps

### gap analysis

| gap | severity | acceptable? |
|-----|----------|-------------|
| "refs are sufficient" (subjective) | none | yes — belief, not testable |
| new contributor orientation | minor | yes — UX pattern, not boot.yml behavior |
| usecase.5 (empty say array) | minor | yes — edge case, unit test coverage |
| usecase.6 (new brief defaults to ref) | minor | yes — implicit behavior, unit test coverage |

### are any requirements left untested?

no. all testable requirements are covered:
- W1 (token reduction): step 1 + edge 1
- W2 (use boot.yml): steps 1-3
- W3 (control say/ref): steps 2-3
- W4 (refs sufficient): step 3 (implicit)
- V1-V2 (usecases): steps 1-3
- V3 (orientation): out of scope
- V4-V9 (outcomes): all covered

---

## step 6: hostile reviewer perspective

### hostile question: how do you know "~8k tokens" is correct?

**answer:** the blueprint predicted ~8k (7 say, 12 ref). step 1 verifies this exact partition. the token estimate comes from the extant `roles boot` output format which includes a tokens line.

### hostile question: what if the token count is 9500?

**answer:** pass criterion is "under 10k", not "exactly 8k". the playtest allows for variance in token estimation while still proof of significant reduction from ~20k baseline.

### hostile question: does step 3 prove unmatched briefs become refs?

**answer:** yes. step 3 lists specific briefs that are not in the say globs (e.g., `cli.repo.introspect.md`, domain.thought/ briefs) and verifies they appear as `<brief.ref/>` tags. this proves the unmatched→ref behavior.

### hostile question: what about the vision's "aha moment"?

**answer:** the vision describes the "aha moment" as observation of the reduced stats. step 1 directly verifies this:
- stats show say=7, ref=12 (partition visible)
- tokens ≈ 8k (reduction visible)

the foreman experiences the same "aha moment" when they verify step 1.

### hostile question: why doesn't the playtest verify filesystem readability?

**answer:** filesystem readability is a system property, not a boot.yml property. the playtest verifies that refs appear with valid paths. the ability to read those paths is guaranteed by the OS, not by boot.yml.

---

## summary

| check | status | evidence |
|-------|--------|----------|
| every wish requirement verified | ✓ yes | W1-W3 all covered (W4 is subjective) |
| every vision usecase verified | ✓ mostly | V1-V2 covered, V3 out of scope |
| every vision outcome verified | ✓ yes | V4-V9 all covered |
| no requirements left untested | ✓ yes | gaps are acceptable |

**verdict:** playtest covers all behaviors from wish and vision.

---

## why this holds

### the fundamental question

does the playtest cover all behaviors?

### the answer

yes. the playtest maps to requirements as follows:

| wish line | playtest step | verification |
|-----------|---------------|--------------|
| "briefs too large" | step 1 + edge 1 | 8k vs 20k comparison |
| "use boot.yml" | steps 1-3 | partition effect proven |
| "control say vs ref" | steps 2-3 | explicit set verification |
| "refs sufficient" | step 3 | refs appear with paths |

| vision outcome | playtest step | verification |
|----------------|---------------|--------------|
| ~20k baseline | edge 1 | absent boot.yml = say all |
| ~8k after | step 1 | tokens under 10k |
| partition control | steps 1-3 | say=7, ref=12 |
| unmatched → ref | step 3 | specific briefs as refs |
| stats show counts | step 1 | say/ref counts in output |
| default preserved | edge 1 | absent boot.yml works |

### evidence chain

| claim | method | result |
|-------|--------|--------|
| wish requirements covered | line-by-line analysis | all 4 requirements mapped |
| vision usecases covered | usecase-by-usecase analysis | 2/3 covered, 1 out of scope |
| vision outcomes covered | outcome-by-outcome analysis | all 6 outcomes mapped |
| gaps acceptable | gap analysis | all gaps are subjective or unit-tested |

### conclusion

vision coverage satisfied because:
1. every testable requirement from wish is mapped to a playtest step
2. every vision outcome is mapped to a playtest step
3. gaps are either subjective beliefs or UX patterns (not testable behaviors)
4. edge cases are covered by unit tests, not byhand playtests

the verification checklist accurately reflects: vision coverage satisfied.
