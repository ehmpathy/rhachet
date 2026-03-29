# self-review r8: has-ergonomics-validated

double-check: does the actual input/output match what felt right at repros?

---

## step 1: locate the repros artifact

### the guide says

> compare the implemented input/output to what was sketched in repros

### verification

```bash
ls .behavior/v2026_03_26.fix-thisrepo-boot/3.2.distill.repros.experience.*.md
```

**actual result:** no such files.

**why this is acceptable:** this is a config-only behavior. no new input/output was designed — boot.yml leverages extant `roles boot` input/output patterns.

---

## step 2: identify planned ergonomics from vision

since no repros were created, the planned ergonomics come from the vision artifact.

### from vision: expected input

```yaml
# .agent/repo=.this/role=any/boot.yml
briefs:
  say:
    - define.rhachet.v3.md          # core identity, always needed
    - define.agent-dir.md           # explains .agent/ structure
```

### from vision: expected output

```
.agent/repo=.this/role=any
  ├─ briefs
  │  ├─ say = 2 (~10k chars)
  │  └─ ref = 17
  └─ skills = 6
```

---

## step 3: compare actual to planned

### actual input (boot.yml)

```yaml
briefs:
  say:
    - briefs/define.rhachet.v3.md
    - briefs/define.agent-dir.md
    - briefs/howto.test-local-rhachet.md
    - briefs/bin.dispatcher.pattern.md
    - briefs/run.executable.lookup.pattern.md
    - briefs/code.test.accept.blackbox.md
    - briefs/rule.require.shared-test-fixtures.md
```

### actual output

```
<stats>
quant
  ├── files = 26
  │   ├── briefs = 19
  │   │   ├── say = 7
  │   │   └── ref = 12
  │   └── skills = 6
  │       ├── say = 6
  │       └── ref = 0
  ├── chars = 32299
  └── tokens ≈ 8075 ($0.02 at $3/mil)
</stats>
```

### comparison

| aspect | vision | actual | delta |
|--------|--------|--------|-------|
| say globs | 2 | 7 | +5 |
| say briefs | 2 | 7 | +5 |
| ref briefs | 17 | 12 | -5 |
| tokens | ~3k | ~8k | +5k |

---

## step 4: analyze the drift

### why the drift occurred

the vision proposed a minimal say set (2 briefs). at implementation time, the wisher expanded the say set to include 5 additional briefs:
- `howto.test-local-rhachet.md`
- `bin.dispatcher.pattern.md`
- `run.executable.lookup.pattern.md`
- `code.test.accept.blackbox.md`
- `rule.require.shared-test-fixtures.md`

### is this drift acceptable?

yes. the vision explicitly stated:

> **wisher review needed:** the say list above is minimal. wisher may want to expand based on which briefs are frequently referenced in daily work.

the blueprint (3.3.1) also included these additional briefs:

```yaml
briefs:
  say:
    # core identity - always boot these
    - briefs/define.rhachet.v3.md
    - briefs/define.agent-dir.md
    # actively used patterns
    - briefs/howto.test-local-rhachet.md
    - briefs/bin.dispatcher.pattern.md
    - briefs/run.executable.lookup.pattern.md
    # test patterns (frequently referenced)
    - briefs/code.test.accept.blackbox.md
    - briefs/rule.require.shared-test-fixtures.md
```

the drift was planned and documented. the implementation matches the blueprint.

---

## step 5: validate ergonomics

### input ergonomics

| aspect | assessment |
|--------|------------|
| file location | standard: `.agent/repo=.this/role=any/boot.yml` |
| file format | standard: YAML |
| key structure | consistent with extant boot.yml patterns |
| glob format | requires `briefs/` prefix (consistent with file layout) |

**verdict:** input ergonomics follow extant patterns. no surprises.

### output ergonomics

| aspect | assessment |
|--------|------------|
| stats block | standard format, shows say/ref counts |
| say briefs | inline content in `<brief.say>` blocks |
| ref briefs | pointer only in `<brief.ref/>` tags |
| token estimate | shown for cost awareness |

**verdict:** output ergonomics match extant `roles boot` behavior. no changes required.

---

## step 6: hostile reviewer perspective

### hostile question: should I update repros to reflect actual design?

**answer:** no repros were created. the vision documented the planned ergonomics. the blueprint refined them. the implementation matches the blueprint. no update needed.

### hostile question: should I update vision to reflect actual design?

**answer:** no. the vision correctly identified that the say list was minimal and that wisher review was needed. the expansion was anticipated. the vision remains accurate as a description of the problem and approach.

### hostile question: did ergonomics drift in unexpected ways?

**answer:** no. the only drift was in the number of say globs, which was explicitly flagged as subject to wisher review. the input/output format, file location, and behavior all match extant patterns.

---

## summary

| check | status | evidence |
|-------|--------|----------|
| repros artifact | not created (config-only) | vision documents ergonomics |
| input matches plan | ✓ yes | boot.yml follows blueprint |
| output matches plan | ✓ yes | stats, say, ref format unchanged |
| drift documented | ✓ yes | vision flagged say list as minimal |
| ergonomics validated | ✓ yes | follows extant patterns |

**verdict:** ergonomics validated (no repros drift, implementation matches blueprint).

---

## why this holds

### the fundamental question

does the actual input/output match what felt right at repros?

### the answer

yes, vacuously. no repros were created for this config-only behavior. the planned ergonomics came from vision and blueprint:

1. **vision** documented minimal say set (2 briefs) with explicit note that wisher may expand
2. **blueprint** documented expanded say set (7 briefs) after review
3. **implementation** matches blueprint exactly

the input/output format leverages extant `roles boot` patterns — no new ergonomics were designed.

### why no repros is acceptable

1. **config-only change** — no new input/output format
2. **extant patterns** — boot.yml format is well-established
3. **no user journey change** — same command, same output format
4. **documented expansion** — vision explicitly flagged say list as subject to review

### conclusion

ergonomics validated because:
1. no repros were created (config-only change)
2. vision documented planned ergonomics with explicit expansion caveat
3. blueprint refined the say list after review
4. implementation matches blueprint
5. input/output format follows extant patterns

the verification checklist accurately reflects: ergonomics validated.
